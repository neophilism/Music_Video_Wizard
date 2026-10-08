import {
  AssetStatus,
  CreativeModuleKind,
  DependencyRelation,
  DomainVersionKind,
  Prisma,
  VersionLifecycle
} from "@prisma/client";
import { db } from "@/lib/db";
import { fingerprintJson } from "@/lib/dependency-graph/fingerprint";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import { ensurePersonalWorkspace } from "@/lib/workspaces";
import type {
  CreativeModuleMetadata,
  CreativeVersionContent
} from "./input";
import { parseVisualAestheticDefinition } from "@/lib/visual-aesthetic/schema";

export class CreativeLibraryError extends Error {}

function normalizeVersionForKind(
  kind: CreativeModuleKind,
  content: CreativeVersionContent
): CreativeVersionContent {
  if (kind !== CreativeModuleKind.VISUAL_AESTHETIC) return content;

  const definition = parseVisualAestheticDefinition(content.definition);
  const referenceAssetVersionIds = [...content.referenceAssetVersionIds];
  if (
    definition.previewAssetVersionId &&
    !referenceAssetVersionIds.includes(definition.previewAssetVersionId)
  ) {
    referenceAssetVersionIds.push(definition.previewAssetVersionId);
  }

  return {
    ...content,
    definition,
    referenceAssetVersionIds
  };
}

function semanticFingerprint(content: CreativeVersionContent): string {
  return fingerprintJson({
    definition: content.definition,
    positivePrompt: content.positivePrompt,
    negativePrompt: content.negativePrompt,
    referenceAssetVersionIds: content.referenceAssetVersionIds
  } as Prisma.JsonValue);
}

async function validateReferences(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  referenceIds: string[]
) {
  if (referenceIds.length === 0) return [];

  const assets = await tx.assetVersion.findMany({
    where: { id: { in: referenceIds } },
    select: {
      id: true,
      nodeId: true,
      status: true,
      asset: { select: { workspaceId: true, name: true, kind: true } }
    }
  });

  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const missing = referenceIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new CreativeLibraryError(
      "Reference asset version not found: " + missing.join(", ")
    );
  }

  const ordered = referenceIds.map((id) => byId.get(id)!);
  for (const asset of ordered) {
    if (asset.asset.workspaceId !== workspaceId) {
      throw new CreativeLibraryError(
        "Creative Library references cannot cross workspaces."
      );
    }
    if (asset.status !== AssetStatus.READY) {
      throw new CreativeLibraryError(
        "Creative Library references must use READY asset versions."
      );
    }
  }

  return ordered;
}

async function createVersionRecords(
  tx: Prisma.TransactionClient,
  input: {
    creativeModuleId: string;
    versionNumber: number;
    workspaceId: string;
    userId: string;
    content: CreativeVersionContent;
  }
) {
  const references = await validateReferences(
    tx,
    input.workspaceId,
    input.content.referenceAssetVersionIds
  );

  const node = await tx.domainVersionNode.create({
    data: {
      kind: DomainVersionKind.CREATIVE_MODULE,
      fingerprint: semanticFingerprint(input.content)
    }
  });

  const version = await tx.creativeModuleVersion.create({
    data: {
      creativeModuleId: input.creativeModuleId,
      nodeId: node.id,
      versionNumber: input.versionNumber,
      definition: input.content.definition,
      positivePrompt: input.content.positivePrompt || null,
      negativePrompt: input.content.negativePrompt || null,
      notes: input.content.notes || null,
      createdByUserId: input.userId,
      references: {
        create: references.map((asset, position) => ({
          assetVersionId: asset.id,
          role: "reference",
          position
        }))
      }
    }
  });

  for (const reference of references) {
    await registerDependencyEdgeInTransaction(tx, {
      upstreamNodeId: reference.nodeId,
      downstreamNodeId: node.id,
      relation: DependencyRelation.REFERENCES,
      reason: "Creative Library version pins a reference asset version."
    });
  }

  return { version, node };
}

export async function createCreativeModule(input: {
  userId: string;
  displayName: string;
  metadata: CreativeModuleMetadata;
  version: CreativeVersionContent;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.$transaction(async (tx) => {
    const libraryItem = await tx.creativeModule.create({
      data: {
        workspaceId: workspace.id,
        kind: input.metadata.kind,
        name: input.metadata.name,
        description: input.metadata.description || null,
        tags: input.metadata.tags
      }
    });
    const version = normalizeVersionForKind(input.metadata.kind, input.version);

    const created = await createVersionRecords(tx, {
      creativeModuleId: libraryItem.id,
      versionNumber: 1,
      workspaceId: workspace.id,
      userId: input.userId,
      content: version
    });

    return {
      moduleId: libraryItem.id,
      versionId: created.version.id,
      nodeId: created.node.id,
      versionNumber: 1
    };
  });
}

export async function createCreativeModuleVersion(input: {
  userId: string;
  displayName: string;
  moduleId: string;
  version: CreativeVersionContent;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.$transaction(
    async (tx) => {
      const libraryItem = await tx.creativeModule.findFirst({
        where: {
          id: input.moduleId,
          workspaceId: workspace.id,
          archivedAt: null
        },
        select: { id: true, kind: true }
      });

      if (!libraryItem) {
        throw new CreativeLibraryError("Creative Library item not found.");
      }

      const latest = await tx.creativeModuleVersion.findFirst({
        where: { creativeModuleId: input.moduleId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true }
      });

      const versionNumber = (latest?.versionNumber ?? 0) + 1;
      const version = normalizeVersionForKind(libraryItem.kind, input.version);
      const created = await createVersionRecords(tx, {
        creativeModuleId: input.moduleId,
        versionNumber,
        workspaceId: workspace.id,
        userId: input.userId,
        content: version
      });

      return {
        moduleId: input.moduleId,
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

export async function publishCreativeModuleVersion(input: {
  userId: string;
  displayName: string;
  moduleId: string;
  versionId: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.$transaction(async (tx) => {
    const version = await tx.creativeModuleVersion.findFirst({
      where: {
        id: input.versionId,
        creativeModuleId: input.moduleId,
        creativeModule: {
          workspaceId: workspace.id,
          archivedAt: null
        }
      },
      select: {
        id: true,
        nodeId: true,
        lifecycle: true,
        versionNumber: true
      }
    });

    if (!version) {
      throw new CreativeLibraryError("Creative Library version not found.");
    }

    if (version.lifecycle === VersionLifecycle.SUPERSEDED) {
      throw new CreativeLibraryError(
        "A superseded Creative Library version cannot be published."
      );
    }

    if (version.lifecycle === VersionLifecycle.LOCKED) {
      return {
        moduleId: input.moduleId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        alreadyPublished: true
      };
    }

    const updated = await tx.creativeModuleVersion.updateMany({
      where: {
        id: version.id,
        lifecycle: VersionLifecycle.DRAFT
      },
      data: {
        lifecycle: VersionLifecycle.LOCKED,
        lockedAt: new Date()
      }
    });

    if (updated.count !== 1) {
      throw new CreativeLibraryError(
        "Creative Library version changed while it was being published."
      );
    }

    return {
      moduleId: input.moduleId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      alreadyPublished: false
    };
  });
}

export async function listCreativeModules(input: {
  userId: string;
  displayName: string;
  query?: string;
  kind?: CreativeModuleKind;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );
  const query = input.query?.trim();

  return db.creativeModule.findMany({
    where: {
      workspaceId: workspace.id,
      archivedAt: null,
      ...(input.kind ? { kind: input.kind } : {}),
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
          createdAt: true
        }
      },
      _count: {
        select: { versions: true }
      }
    }
  });
}

export async function getCreativeModule(input: {
  userId: string;
  displayName: string;
  moduleId: string;
}) {
  const workspace = await ensurePersonalWorkspace(
    input.userId,
    input.displayName
  );

  return db.creativeModule.findFirst({
    where: {
      id: input.moduleId,
      workspaceId: workspace.id,
      archivedAt: null
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          references: {
            orderBy: { position: "asc" },
            include: {
              assetVersion: {
                include: {
                  asset: {
                    select: { name: true, kind: true }
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
