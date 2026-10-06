import {
  DependencyRelation,
  DomainVersionKind,
  Prisma,
  VersionLifecycle
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  registerDependencyEdgeInTransaction,
  removeDependencyEdgeInTransaction
} from "@/lib/dependency-graph/service";
import {
  assertSupportedCreativeScopeKind,
  CreativeInheritanceError,
  normalizeCreativeSlot
} from "./resolver";

export type BindingTransaction = Prisma.TransactionClient;

interface CreativeScopeContext {
  kind: DomainVersionKind;
  lifecycle: VersionLifecycle;
  workspaceId: string;
}

async function loadCreativeScopeContext(
  tx: BindingTransaction,
  scopeNodeId: string
): Promise<CreativeScopeContext> {
  const node = await tx.domainVersionNode.findUnique({
    where: { id: scopeNodeId },
    select: {
      kind: true,
      projectVersion: {
        select: {
          lifecycle: true,
          project: { select: { workspaceId: true } }
        }
      },
      sequenceVersion: {
        select: {
          lifecycle: true,
          sequence: {
            select: {
              project: { select: { workspaceId: true } }
            }
          }
        }
      },
      shotVersion: {
        select: {
          lifecycle: true,
          shot: {
            select: {
              project: { select: { workspaceId: true } }
            }
          }
        }
      }
    }
  });

  if (!node) {
    throw new CreativeInheritanceError(
      "Creative binding scope node not found: " + scopeNodeId
    );
  }

  assertSupportedCreativeScopeKind(node.kind);

  switch (node.kind) {
    case DomainVersionKind.PROJECT:
      if (!node.projectVersion) {
        throw new CreativeInheritanceError(
          "Project scope node is missing its project version."
        );
      }
      return {
        kind: node.kind,
        lifecycle: node.projectVersion.lifecycle,
        workspaceId: node.projectVersion.project.workspaceId
      };

    case DomainVersionKind.SEQUENCE:
      if (!node.sequenceVersion) {
        throw new CreativeInheritanceError(
          "Sequence scope node is missing its sequence version."
        );
      }
      return {
        kind: node.kind,
        lifecycle: node.sequenceVersion.lifecycle,
        workspaceId: node.sequenceVersion.sequence.project.workspaceId
      };

    case DomainVersionKind.SHOT:
      if (!node.shotVersion) {
        throw new CreativeInheritanceError(
          "Shot scope node is missing its shot version."
        );
      }
      return {
        kind: node.kind,
        lifecycle: node.shotVersion.lifecycle,
        workspaceId: node.shotVersion.shot.project.workspaceId
      };

    default: {
      const exhaustive: never = node.kind;
      throw new CreativeInheritanceError(
        "Unsupported creative binding scope kind: " + exhaustive
      );
    }
  }
}

async function removeBindingDependencyIfUnused(
  tx: BindingTransaction,
  scopeNodeId: string,
  creativeModuleVersionId: string,
  creativeModuleNodeId: string
): Promise<void> {
  const remaining = await tx.creativeBinding.count({
    where: {
      scopeNodeId,
      creativeModuleVersionId
    }
  });

  if (remaining > 0) return;

  const edge = await tx.dependencyEdge.findUnique({
    where: {
      upstreamNodeId_downstreamNodeId_relation: {
        upstreamNodeId: creativeModuleNodeId,
        downstreamNodeId: scopeNodeId,
        relation: DependencyRelation.REFERENCES
      }
    },
    select: { reason: true }
  });

  if (!edge?.reason?.startsWith("Creative binding:")) return;

  await removeDependencyEdgeInTransaction(tx, {
    upstreamNodeId: creativeModuleNodeId,
    downstreamNodeId: scopeNodeId,
    relation: DependencyRelation.REFERENCES
  });
}

export async function setCreativeBindingInTransaction(
  tx: BindingTransaction,
  input: {
    scopeNodeId: string;
    slot: string;
    creativeModuleVersionId: string;
  }
) {
  const slot = normalizeCreativeSlot(input.slot);
  const scope = await loadCreativeScopeContext(tx, input.scopeNodeId);
  if (scope.lifecycle !== VersionLifecycle.DRAFT) {
    throw new CreativeInheritanceError(
      "Creative bindings can only be changed on DRAFT scope versions."
    );
  }

  const moduleVersion = await tx.creativeModuleVersion.findUnique({
    where: { id: input.creativeModuleVersionId },
    select: {
      id: true,
      nodeId: true,
      lifecycle: true,
      creativeModule: {
        select: {
          workspaceId: true
        }
      }
    }
  });

  if (!moduleVersion) {
    throw new CreativeInheritanceError(
      "Creative module version not found: " +
        input.creativeModuleVersionId
    );
  }

  if (moduleVersion.lifecycle === VersionLifecycle.SUPERSEDED) {
    throw new CreativeInheritanceError(
      "A superseded creative module version cannot receive a new binding."
    );
  }

  if (moduleVersion.creativeModule.workspaceId !== scope.workspaceId) {
    throw new CreativeInheritanceError(
      "Creative modules cannot be bound across workspaces."
    );
  }

  const existing = await tx.creativeBinding.findUnique({
    where: {
      scopeNodeId_slot: {
        scopeNodeId: input.scopeNodeId,
        slot
      }
    },
    select: {
      creativeModuleVersionId: true,
      creativeModuleVersion: {
        select: { nodeId: true }
      }
    }
  });

  const binding = await tx.creativeBinding.upsert({
    where: {
      scopeNodeId_slot: {
        scopeNodeId: input.scopeNodeId,
        slot
      }
    },
    create: {
      scopeNodeId: input.scopeNodeId,
      slot,
      creativeModuleVersionId: input.creativeModuleVersionId
    },
    update: {
      creativeModuleVersionId: input.creativeModuleVersionId
    }
  });

  await registerDependencyEdgeInTransaction(tx, {
    upstreamNodeId: moduleVersion.nodeId,
    downstreamNodeId: input.scopeNodeId,
    relation: DependencyRelation.REFERENCES,
    reason:
      'Creative binding: slot "' +
      slot +
      '" controls the ' +
      scope.kind.toLowerCase() +
      " scope."
  });

  if (
    existing &&
    existing.creativeModuleVersionId !== input.creativeModuleVersionId
  ) {
    await removeBindingDependencyIfUnused(
      tx,
      input.scopeNodeId,
      existing.creativeModuleVersionId,
      existing.creativeModuleVersion.nodeId
    );
  }

  return binding;
}

export async function setCreativeBinding(input: {
  scopeNodeId: string;
  slot: string;
  creativeModuleVersionId: string;
}) {
  return db.$transaction((tx) =>
    setCreativeBindingInTransaction(tx, input)
  );
}

export async function removeCreativeBinding(input: {
  scopeNodeId: string;
  slot: string;
}) {
  const slot = normalizeCreativeSlot(input.slot);

  return db.$transaction(async (tx) => {
    const scope = await loadCreativeScopeContext(tx, input.scopeNodeId);
    if (scope.lifecycle !== VersionLifecycle.DRAFT) {
      throw new CreativeInheritanceError(
        "Creative bindings can only be changed on DRAFT scope versions."
      );
    }

    const existing = await tx.creativeBinding.findUnique({
      where: {
        scopeNodeId_slot: {
          scopeNodeId: input.scopeNodeId,
          slot
        }
      },
      select: {
        id: true,
        creativeModuleVersionId: true,
        creativeModuleVersion: {
          select: { nodeId: true }
        }
      }
    });

    if (!existing) return { count: 0 };

    await tx.creativeBinding.delete({
      where: { id: existing.id }
    });

    await removeBindingDependencyIfUnused(
      tx,
      input.scopeNodeId,
      existing.creativeModuleVersionId,
      existing.creativeModuleVersion.nodeId
    );

    return { count: 1 };
  });
}
