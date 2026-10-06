import {
  DependencyRelation,
  DomainVersionKind,
  Prisma,
  VersionLifecycle
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  loadCreativeScopeContext,
  setCreativeBindingInTransaction
} from "@/lib/creative-inheritance/bindings";
import { fingerprintJson } from "@/lib/dependency-graph/fingerprint";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import { lockVersionNode } from "@/lib/dependency-graph/version-lock";
import { ensurePersonalWorkspace } from "@/lib/workspaces";
import type {
  CreativeKitItemInput,
  CreativeKitMetadata,
  CreativeKitVersionInput
} from "./input";

export class CreativeKitError extends Error {}

export type CreativeKitApplyMode = "overwrite" | "fill-empty";

function kitFingerprint(items: CreativeKitItemInput[]): string {
  const semanticItems = [...items]
    .sort((left, right) => left.slot.localeCompare(right.slot))
    .map((item) => ({
      slot: item.slot,
      creativeModuleVersionId: item.creativeModuleVersionId
    }));

  return fingerprintJson({ items: semanticItems } as Prisma.JsonValue);
}

async function loadPublishedModuleVersions(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  items: CreativeKitItemInput[]
) {
  const ids = [...new Set(items.map((item) => item.creativeModuleVersionId))];
  const versions = await tx.creativeModuleVersion.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nodeId: true,
      lifecycle: true,
      versionNumber: true,
      creativeModule: {
        select: {
          id: true,
          workspaceId: true,
          name: true,
          kind: true,
          archivedAt: true
        }
      }
    }
  });

  const byId = new Map(versions.map((version) => [version.id, version]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new CreativeKitError(
      "Creative Library version not found: " + missing.join(", ")
    );
  }

  for (const version of versions) {
    if (
      version.creativeModule.workspaceId !== workspaceId ||
      version.creativeModule.archivedAt
    ) {
      throw new CreativeKitError(
        "Creative Kits cannot reference Library versions outside the active workspace."
      );
    }

    if (version.lifecycle !== VersionLifecycle.LOCKED) {
      throw new CreativeKitError(
        "Creative Kits can only include published (LOCKED) Library versions."
      );
    }
  }

  return byId;
}

async function createKitVersionRecords(
  tx: Prisma.TransactionClient,
  input: {
    creativeKitId: string;
    versionNumber: number;
    workspaceId: string;
    userId: string;
    version: CreativeKitVersionInput;
  }
) {
  const versionsById = await loadPublishedModuleVersions(
    tx,
    input.workspaceId,
    input.version.items
  );

  const node = await tx.domainVersionNode.create({
    data: {
      kind: DomainVersionKind.CREATIVE_KIT,
      fingerprint: kitFingerprint(input.version.items)
    }
  });

  const version = await tx.creativeKitVersion.create({
    data: {
      creativeKitId: input.creativeKitId,
      nodeId: node.id,
      versionNumber: input.versionNumber,
      notes: input.version.notes || null,
      createdByUserId: input.userId,
      items: {
        create: input.version.items.map((item, position) => ({
          slot: item.slot,
          position,
          creativeModuleVersionId: item.creativeModuleVersionId
        }))
      }
    }
  });

  for (const item of input.version.items) {
    const moduleVersion = versionsById.get(item.creativeModuleVersionId)!;
    await registerDependencyEdgeInTransaction(tx, {
      upstreamNodeId: moduleVersion.nodeId,
      downstreamNodeId: node.id,
      relation: DependencyRelation.REFERENCES,
      reason:
        'Creative Kit slot "' +
        item.slot +
        '" pins Library item "' +
        moduleVersion.creativeModule.name +
        '" v' +
        moduleVersion.versionNumber +
        "."
    });
  }

  return { node, version };
}

export async function createCreativeKit(input: {
  userId: string;
  displayName: string;
  metadata: CreativeKitMetadata;
  version: CreativeKitVersionInput;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.$transaction(async (tx) => {
    const kit = await tx.creativeKit.create({
      data: {
        workspaceId: workspace.id,
        name: input.metadata.name,
        description: input.metadata.description || null,
        tags: input.metadata.tags
      }
    });

    const created = await createKitVersionRecords(tx, {
      creativeKitId: kit.id,
      versionNumber: 1,
      workspaceId: workspace.id,
      userId: input.userId,
      version: input.version
    });

    return {
      kitId: kit.id,
      versionId: created.version.id,
      nodeId: created.node.id,
      versionNumber: 1
    };
  });
}

export async function createCreativeKitVersion(input: {
  userId: string;
  displayName: string;
  kitId: string;
  version: CreativeKitVersionInput;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.$transaction(
    async (tx) => {
      const kit = await tx.creativeKit.findFirst({
        where: {
          id: input.kitId,
          workspaceId: workspace.id,
          archivedAt: null
        },
        select: { id: true }
      });

      if (!kit) {
        throw new CreativeKitError("Creative Kit not found.");
      }

      const latest = await tx.creativeKitVersion.findFirst({
        where: { creativeKitId: input.kitId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      const versionNumber = (latest?.versionNumber ?? 0) + 1;
      const created = await createKitVersionRecords(tx, {
        creativeKitId: input.kitId,
        versionNumber,
        workspaceId: workspace.id,
        userId: input.userId,
        version: input.version
      });

      return {
        kitId: input.kitId,
        versionId: created.version.id,
        nodeId: created.node.id,
        versionNumber
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );
}

export async function publishCreativeKitVersion(input: {
  userId: string;
  displayName: string;
  kitId: string;
  versionId: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  const version = await db.creativeKitVersion.findFirst({
    where: {
      id: input.versionId,
      creativeKitId: input.kitId,
      creativeKit: {
        workspaceId: workspace.id,
        archivedAt: null
      }
    },
    select: {
      id: true,
      nodeId: true,
      versionNumber: true,
      lifecycle: true
    }
  });

  if (!version) {
    throw new CreativeKitError("Creative Kit version not found.");
  }

  if (version.lifecycle === VersionLifecycle.SUPERSEDED) {
    throw new CreativeKitError(
      "A superseded Creative Kit version cannot be published."
    );
  }

  const result = await lockVersionNode(version.nodeId);
  return {
    kitId: input.kitId,
    versionId: version.id,
    versionNumber: version.versionNumber,
    alreadyPublished: result.alreadyLocked
  };
}

export async function applyCreativeKitVersion(input: {
  userId: string;
  displayName: string;
  kitId: string;
  versionId: string;
  scopeNodeId: string;
  mode?: CreativeKitApplyMode;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );
  const mode = input.mode ?? "overwrite";

  return db.$transaction(async (tx) => {
    const scope = await loadCreativeScopeContext(tx, input.scopeNodeId);
    if (scope.lifecycle !== VersionLifecycle.DRAFT) {
      throw new CreativeKitError(
        "Creative Kits can only be applied to DRAFT scope versions."
      );
    }
    if (scope.workspaceId !== workspace.id) {
      throw new CreativeKitError(
        "Creative Kits cannot be applied across workspaces."
      );
    }

    const kitVersion = await tx.creativeKitVersion.findFirst({
      where: {
        id: input.versionId,
        creativeKitId: input.kitId,
        lifecycle: VersionLifecycle.LOCKED,
        creativeKit: {
          workspaceId: workspace.id,
          archivedAt: null
        }
      },
      include: {
        items: {
          orderBy: { position: "asc" },
          select: {
            slot: true,
            creativeModuleVersionId: true
          }
        }
      }
    });

    if (!kitVersion) {
      throw new CreativeKitError(
        "Only a published Creative Kit version can be applied."
      );
    }

    const existing =
      mode === "fill-empty"
        ? await tx.creativeBinding.findMany({
            where: {
              scopeNodeId: input.scopeNodeId,
              slot: { in: kitVersion.items.map((item) => item.slot) }
            },
            select: { slot: true }
          })
        : [];
    const occupied = new Set(existing.map((binding) => binding.slot));

    const appliedSlots: string[] = [];
    const skippedSlots: string[] = [];

    for (const item of kitVersion.items) {
      if (mode === "fill-empty" && occupied.has(item.slot)) {
        skippedSlots.push(item.slot);
        continue;
      }

      await setCreativeBindingInTransaction(tx, {
        scopeNodeId: input.scopeNodeId,
        slot: item.slot,
        creativeModuleVersionId: item.creativeModuleVersionId
      });
      appliedSlots.push(item.slot);
    }

    return {
      kitId: input.kitId,
      versionId: input.versionId,
      scopeNodeId: input.scopeNodeId,
      mode,
      appliedSlots,
      skippedSlots
    };
  });
}

export async function listCreativeKits(input: {
  userId: string;
  displayName: string;
  query?: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );
  const query = input.query?.trim();

  return db.creativeKit.findMany({
    where: {
      workspaceId: workspace.id,
      archivedAt: null,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { tags: { has: query.toLowerCase() } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          id: true,
          nodeId: true,
          versionNumber: true,
          lifecycle: true,
          createdAt: true,
          _count: {
            select: { items: true }
          }
        }
      },
      _count: {
        select: { versions: true }
      }
    }
  });
}

export async function getCreativeKit(input: {
  userId: string;
  displayName: string;
  kitId: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.creativeKit.findFirst({
    where: {
      id: input.kitId,
      workspaceId: workspace.id,
      archivedAt: null
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: {
              creativeModuleVersion: {
                include: {
                  creativeModule: {
                    select: {
                      id: true,
                      name: true,
                      kind: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

export async function listPublishedCreativeModuleVersions(input: {
  userId: string;
  displayName: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  const versions = await db.creativeModuleVersion.findMany({
    where: {
      lifecycle: VersionLifecycle.LOCKED,
      creativeModule: {
        workspaceId: workspace.id,
        archivedAt: null
      }
    },
    include: {
      creativeModule: {
        select: {
          id: true,
          name: true,
          kind: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return versions.sort((left, right) => {
    const byName = left.creativeModule.name.localeCompare(
      right.creativeModule.name
    );
    if (byName !== 0) return byName;
    return right.versionNumber - left.versionNumber;
  });
}
