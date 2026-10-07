import {
  DomainVersionKind,
  VersionLifecycle
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  DependencyGraphError,
  DependencyNodeNotFoundError
} from "./service";

export interface LockVersionResult {
  nodeId: string;
  kind: DomainVersionKind;
  locked: boolean;
  alreadyLocked: boolean;
}

interface LockableVersionOwner {
  id: string;
  lifecycle: VersionLifecycle;
}

export async function lockVersionNode(
  nodeId: string
): Promise<LockVersionResult> {
  return db.$transaction(async (tx) => {
    const node = await tx.domainVersionNode.findUnique({
      where: { id: nodeId },
      select: {
        kind: true,
        projectVersion: {
          select: { id: true, lifecycle: true }
        },
        sequenceVersion: {
          select: { id: true, lifecycle: true }
        },
        shotVersion: {
          select: { id: true, lifecycle: true }
        },
        creativeModuleVersion: {
          select: { id: true, lifecycle: true }
        },
        creativeKitVersion: {
          select: { id: true, lifecycle: true }
        },
        musicAnalysisVersion: {
          select: { id: true, lifecycle: true }
        },
        musicMapVersion: {
          select: { id: true, lifecycle: true }
        },
        creativeBriefVersion: {
          select: { id: true, lifecycle: true }
        },
        conceptSetVersion: {
          select: { id: true, lifecycle: true }
        },
        timelineVersion: {
          select: { id: true, lifecycle: true }
        }
      }
    });

    if (!node) throw new DependencyNodeNotFoundError([nodeId]);

    if (node.kind === DomainVersionKind.ASSET) {
      throw new DependencyGraphError(
        "Asset versions are immutable media records and do not use semantic version locking."
      );
    }

    const kind = node.kind;
    const now = new Date();

    if (kind === DomainVersionKind.CREATIVE_KIT) {
      const unlockedKitItem = await tx.creativeKitItem.findFirst({
        where: {
          creativeKitVersion: { nodeId },
          creativeModuleVersion: {
            lifecycle: { not: VersionLifecycle.LOCKED }
          }
        },
        select: {
          slot: true,
          creativeModuleVersionId: true
        }
      });

      if (unlockedKitItem) {
        throw new DependencyGraphError(
          'Cannot lock creative kit ' +
            nodeId +
            ' while slot "' +
            unlockedKitItem.slot +
            '" points to unlocked creative module version ' +
            unlockedKitItem.creativeModuleVersionId +
            "."
        );
      }
    }

    if (
      kind === DomainVersionKind.PROJECT ||
      kind === DomainVersionKind.SEQUENCE ||
      kind === DomainVersionKind.SHOT
    ) {
      const unlockedBinding = await tx.creativeBinding.findFirst({
        where: {
          scopeNodeId: nodeId,
          creativeModuleVersion: {
            lifecycle: {
              not: VersionLifecycle.LOCKED
            }
          }
        },
        select: {
          slot: true,
          creativeModuleVersionId: true
        }
      });

      if (unlockedBinding) {
        throw new DependencyGraphError(
          'Cannot lock scope ' +
            nodeId +
            ' while creative binding "' +
            unlockedBinding.slot +
            '" points to unlocked creative module version ' +
            unlockedBinding.creativeModuleVersionId +
            "."
        );
      }
    }

    async function lockOwner(
      owner: LockableVersionOwner | null,
      updateById: (id: string) => Promise<{ count: number }>
    ): Promise<LockVersionResult> {
      if (!owner) {
        throw new DependencyGraphError(
          "Node " + nodeId + " is missing its " + kind + " version owner."
        );
      }

      if (owner.lifecycle === VersionLifecycle.LOCKED) {
        return {
          nodeId,
          kind,
          locked: false,
          alreadyLocked: true
        };
      }

      if (owner.lifecycle !== VersionLifecycle.DRAFT) {
        throw new DependencyGraphError(
          "Only DRAFT versions can be locked; node " +
            nodeId +
            " is " +
            owner.lifecycle +
            "."
        );
      }

      const updated = await updateById(owner.id);
      if (updated.count !== 1) {
        throw new DependencyGraphError(
          "Version " + nodeId + " changed while it was being locked."
        );
      }

      return {
        nodeId,
        kind,
        locked: true,
        alreadyLocked: false
      };
    }

    switch (kind) {
      case DomainVersionKind.PROJECT:
        return lockOwner(node.projectVersion, (id) =>
          tx.projectVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.SEQUENCE:
        return lockOwner(node.sequenceVersion, (id) =>
          tx.sequenceVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.SHOT:
        return lockOwner(node.shotVersion, (id) =>
          tx.shotVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.CREATIVE_MODULE:
        return lockOwner(node.creativeModuleVersion, (id) =>
          tx.creativeModuleVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.CREATIVE_KIT:
        return lockOwner(node.creativeKitVersion, (id) =>
          tx.creativeKitVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.MUSIC_ANALYSIS:
        return lockOwner(node.musicAnalysisVersion, (id) =>
          tx.musicAnalysisVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.MUSIC_MAP:
        return lockOwner(node.musicMapVersion, (id) =>
          tx.musicMapVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.CREATIVE_BRIEF:
        return lockOwner(node.creativeBriefVersion, (id) =>
          tx.creativeBriefVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.CONCEPT_SET:
        return lockOwner(node.conceptSetVersion, (id) =>
          tx.conceptSetVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.TIMELINE:
        return lockOwner(node.timelineVersion, (id) =>
          tx.timelineVersion.updateMany({
            where: {
              id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      default: {
        const exhaustive: never = kind;
        throw new DependencyGraphError(
          "Unsupported semantic version kind: " + exhaustive
        );
      }
    }
  });
}
