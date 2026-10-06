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

    const now = new Date();

    async function lockOwner(
      owner:
        | { id: string; lifecycle: VersionLifecycle }
        | null,
      update: () => Promise<{ count: number }>
    ): Promise<LockVersionResult> {
      if (!owner) {
        throw new DependencyGraphError(
          "Node " + nodeId + " is missing its " + node.kind + " version owner."
        );
      }

      if (owner.lifecycle === VersionLifecycle.LOCKED) {
        return {
          nodeId,
          kind: node.kind,
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

      const updated = await update();
      if (updated.count !== 1) {
        throw new DependencyGraphError(
          "Version " + nodeId + " changed while it was being locked."
        );
      }

      return {
        nodeId,
        kind: node.kind,
        locked: true,
        alreadyLocked: false
      };
    }

    switch (node.kind) {
      case DomainVersionKind.PROJECT:
        return lockOwner(node.projectVersion, () =>
          tx.projectVersion.updateMany({
            where: {
              id: node.projectVersion!.id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.SEQUENCE:
        return lockOwner(node.sequenceVersion, () =>
          tx.sequenceVersion.updateMany({
            where: {
              id: node.sequenceVersion!.id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.SHOT:
        return lockOwner(node.shotVersion, () =>
          tx.shotVersion.updateMany({
            where: {
              id: node.shotVersion!.id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.CREATIVE_MODULE:
        return lockOwner(node.creativeModuleVersion, () =>
          tx.creativeModuleVersion.updateMany({
            where: {
              id: node.creativeModuleVersion!.id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.TIMELINE:
        return lockOwner(node.timelineVersion, () =>
          tx.timelineVersion.updateMany({
            where: {
              id: node.timelineVersion!.id,
              lifecycle: VersionLifecycle.DRAFT
            },
            data: {
              lifecycle: VersionLifecycle.LOCKED,
              lockedAt: now
            }
          })
        );

      case DomainVersionKind.ASSET:
        throw new DependencyGraphError("Unreachable asset locking branch.");
    }
  });
}
