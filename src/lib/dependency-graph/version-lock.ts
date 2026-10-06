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
