import { DomainVersionKind } from "@prisma/client";
import { db } from "@/lib/db";
import {
  CreativeInheritanceError,
  resolveCreativeBindingCandidates
} from "./resolver";
import type {
  CreativeBindingCandidate,
  CreativeInheritanceResolution,
  CreativeInheritanceScope
} from "./types";

export interface ResolveCreativeInheritanceInput {
  projectVersionId: string;
  sequenceVersionId?: string;
  shotVersionId?: string;
}

export async function resolveCreativeInheritance(
  input: ResolveCreativeInheritanceInput
): Promise<CreativeInheritanceResolution> {
  if (input.shotVersionId && !input.sequenceVersionId) {
    throw new CreativeInheritanceError(
      "A shot inheritance resolution requires its pinned sequence version."
    );
  }

  const projectVersion = await db.projectVersion.findUnique({
    where: { id: input.projectVersionId },
    select: {
      id: true,
      nodeId: true,
      projectId: true
    }
  });

  if (!projectVersion) {
    throw new CreativeInheritanceError(
      "Project version not found: " + input.projectVersionId
    );
  }

  const scopes: CreativeInheritanceScope[] = [
    {
      nodeId: projectVersion.nodeId,
      versionId: projectVersion.id,
      kind: DomainVersionKind.PROJECT
    }
  ];

  if (input.sequenceVersionId) {
    const sequenceVersion = await db.sequenceVersion.findUnique({
      where: { id: input.sequenceVersionId },
      select: {
        id: true,
        nodeId: true,
        sequence: {
          select: { projectId: true }
        },
        projectLinks: {
          where: { projectVersionId: input.projectVersionId },
          select: { id: true },
          take: 1
        }
      }
    });

    if (!sequenceVersion) {
      throw new CreativeInheritanceError(
        "Sequence version not found: " + input.sequenceVersionId
      );
    }

    if (sequenceVersion.sequence.projectId !== projectVersion.projectId) {
      throw new CreativeInheritanceError(
        "Sequence version belongs to a different project."
      );
    }

    if (sequenceVersion.projectLinks.length !== 1) {
      throw new CreativeInheritanceError(
        "Sequence version is not pinned by the requested project version."
      );
    }

    scopes.push({
      nodeId: sequenceVersion.nodeId,
      versionId: sequenceVersion.id,
      kind: DomainVersionKind.SEQUENCE
    });
  }

  if (input.shotVersionId) {
    const shotVersion = await db.shotVersion.findUnique({
      where: { id: input.shotVersionId },
      select: {
        id: true,
        nodeId: true,
        shot: {
          select: { projectId: true }
        },
        sequenceLinks: {
          where: { sequenceVersionId: input.sequenceVersionId! },
          select: { id: true },
          take: 1
        }
      }
    });

    if (!shotVersion) {
      throw new CreativeInheritanceError(
        "Shot version not found: " + input.shotVersionId
      );
    }

    if (shotVersion.shot.projectId !== projectVersion.projectId) {
      throw new CreativeInheritanceError(
        "Shot version belongs to a different project."
      );
    }

    if (shotVersion.sequenceLinks.length !== 1) {
      throw new CreativeInheritanceError(
        "Shot version is not pinned by the requested sequence version."
      );
    }

    scopes.push({
      nodeId: shotVersion.nodeId,
      versionId: shotVersion.id,
      kind: DomainVersionKind.SHOT
    });
  }

  const bindings = await db.creativeBinding.findMany({
    where: {
      scopeNodeId: {
        in: scopes.map(({ nodeId }) => nodeId)
      }
    },
    select: {
      id: true,
      scopeNodeId: true,
      slot: true,
      creativeModuleVersionId: true,
      creativeModuleVersion: {
        select: {
          nodeId: true,
          versionNumber: true,
          creativeModule: {
            select: {
              kind: true,
              name: true
            }
          }
        }
      }
    }
  });

  const candidates: CreativeBindingCandidate[] = bindings.map((binding) => ({
    bindingId: binding.id,
    scopeNodeId: binding.scopeNodeId,
    slot: binding.slot,
    creativeModuleVersionId: binding.creativeModuleVersionId,
    creativeModuleNodeId: binding.creativeModuleVersion.nodeId,
    moduleKind: binding.creativeModuleVersion.creativeModule.kind,
    moduleName: binding.creativeModuleVersion.creativeModule.name,
    moduleVersionNumber: binding.creativeModuleVersion.versionNumber
  }));

  return resolveCreativeBindingCandidates(scopes, candidates);
}
