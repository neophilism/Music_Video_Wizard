import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  CreativeModuleKind,
  DomainVersionKind,
  VersionLifecycle
} from "@prisma/client";
import { db } from "../src/lib/db";
import {
  removeCreativeBinding,
  setCreativeBinding
} from "../src/lib/creative-inheritance/bindings";
import {
  CreativeInheritanceError
} from "../src/lib/creative-inheritance/resolver";
import {
  resolveCreativeInheritance
} from "../src/lib/creative-inheritance/service";
import { lockVersionNode } from "../src/lib/dependency-graph/version-lock";

async function main() {
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const projectId = randomUUID();
  const projectNodeId = randomUUID();
  const projectVersionId = randomUUID();
  const sequenceId = randomUUID();
  const sequenceNodeId = randomUUID();
  const sequenceVersionId = randomUUID();
  const shotId = randomUUID();
  const shotNodeId = randomUUID();
  const shotVersionId = randomUUID();

  const moduleDefinitions = [
    {
      id: randomUUID(),
      versionId: randomUUID(),
      nodeId: randomUUID(),
      workspaceId,
      name: "Project style",
      kind: CreativeModuleKind.VISUAL_AESTHETIC
    },
    {
      id: randomUUID(),
      versionId: randomUUID(),
      nodeId: randomUUID(),
      workspaceId,
      name: "Sequence style",
      kind: CreativeModuleKind.VISUAL_AESTHETIC
    },
    {
      id: randomUUID(),
      versionId: randomUUID(),
      nodeId: randomUUID(),
      workspaceId,
      name: "Shot camera",
      kind: CreativeModuleKind.MOTION_GRAMMAR
    },
    {
      id: randomUUID(),
      versionId: randomUUID(),
      nodeId: randomUUID(),
      workspaceId: otherWorkspaceId,
      name: "Foreign style",
      kind: CreativeModuleKind.VISUAL_AESTHETIC
    }
  ];

  try {
    await db.workspace.createMany({
      data: [
        { id: workspaceId, name: "Inheritance smoke workspace" },
        { id: otherWorkspaceId, name: "Other workspace" }
      ]
    });

    await db.project.create({
      data: {
        id: projectId,
        workspaceId,
        title: "Inheritance smoke project"
      }
    });

    await db.domainVersionNode.createMany({
      data: [
        { id: projectNodeId, kind: DomainVersionKind.PROJECT },
        { id: sequenceNodeId, kind: DomainVersionKind.SEQUENCE },
        { id: shotNodeId, kind: DomainVersionKind.SHOT },
        ...moduleDefinitions.map((module) => ({
          id: module.nodeId,
          kind: DomainVersionKind.CREATIVE_MODULE
        }))
      ]
    });

    await db.projectVersion.create({
      data: {
        id: projectVersionId,
        projectId,
        nodeId: projectNodeId,
        versionNumber: 1,
        title: "Inheritance smoke project"
      }
    });

    await db.sequence.create({
      data: {
        id: sequenceId,
        projectId
      }
    });

    await db.sequenceVersion.create({
      data: {
        id: sequenceVersionId,
        sequenceId,
        nodeId: sequenceNodeId,
        versionNumber: 1,
        title: "Sequence"
      }
    });

    await db.projectVersionSequence.create({
      data: {
        projectVersionId,
        sequenceVersionId,
        position: 0
      }
    });

    await db.shot.create({
      data: {
        id: shotId,
        projectId
      }
    });

    await db.shotVersion.create({
      data: {
        id: shotVersionId,
        shotId,
        nodeId: shotNodeId,
        versionNumber: 1,
        label: "Shot"
      }
    });

    await db.sequenceVersionShot.create({
      data: {
        sequenceVersionId,
        shotVersionId,
        position: 0
      }
    });

    for (const module of moduleDefinitions) {
      await db.creativeModule.create({
        data: {
          id: module.id,
          workspaceId: module.workspaceId,
          kind: module.kind,
          name: module.name
        }
      });

      await db.creativeModuleVersion.create({
        data: {
          id: module.versionId,
          creativeModuleId: module.id,
          nodeId: module.nodeId,
          versionNumber: 1,
          definition: { smoke: true }
        }
      });
    }

    const [projectStyle, sequenceStyle, shotCamera, foreignStyle] =
      moduleDefinitions;

    await setCreativeBinding({
      scopeNodeId: projectNodeId,
      slot: "visual-aesthetic",
      creativeModuleVersionId: projectStyle.versionId
    });
    await setCreativeBinding({
      scopeNodeId: sequenceNodeId,
      slot: "visual-aesthetic",
      creativeModuleVersionId: sequenceStyle.versionId
    });
    await setCreativeBinding({
      scopeNodeId: shotNodeId,
      slot: "camera-motion",
      creativeModuleVersionId: shotCamera.versionId
    });

    const resolution = await resolveCreativeInheritance({
      projectVersionId,
      sequenceVersionId,
      shotVersionId
    });

    const visual = resolution.bindings.find(
      ({ slot }) => slot === "visual-aesthetic"
    );
    assert.equal(
      visual?.creativeModuleVersionId,
      sequenceStyle.versionId
    );
    assert.equal(
      visual?.shadowed[0]?.creativeModuleVersionId,
      projectStyle.versionId
    );

    const camera = resolution.bindings.find(
      ({ slot }) => slot === "camera-motion"
    );
    assert.equal(camera?.creativeModuleVersionId, shotCamera.versionId);
    assert.equal(camera?.sourceScope.kind, DomainVersionKind.SHOT);

    const bindingEdges = await db.dependencyEdge.count({
      where: {
        OR: [
          {
            upstreamNodeId: projectStyle.nodeId,
            downstreamNodeId: projectNodeId
          },
          {
            upstreamNodeId: sequenceStyle.nodeId,
            downstreamNodeId: sequenceNodeId
          },
          {
            upstreamNodeId: shotCamera.nodeId,
            downstreamNodeId: shotNodeId
          }
        ]
      }
    });
    assert.equal(bindingEdges, 3);

    await assert.rejects(
      () =>
        setCreativeBinding({
          scopeNodeId: shotNodeId,
          slot: "foreign-style",
          creativeModuleVersionId: foreignStyle.versionId
        }),
      CreativeInheritanceError
    );

    await db.creativeModuleVersion.updateMany({
      where: {
        id: {
          in: [
            projectStyle.versionId,
            sequenceStyle.versionId,
            shotCamera.versionId
          ]
        }
      },
      data: {
        lifecycle: VersionLifecycle.LOCKED,
        lockedAt: new Date()
      }
    });

    await lockVersionNode(shotNodeId);

    await assert.rejects(
      () =>
        setCreativeBinding({
          scopeNodeId: shotNodeId,
          slot: "camera-motion",
          creativeModuleVersionId: shotCamera.versionId
        }),
      CreativeInheritanceError
    );

    await removeCreativeBinding({
      scopeNodeId: sequenceNodeId,
      slot: "visual-aesthetic"
    });

    const inheritedFromProject = await resolveCreativeInheritance({
      projectVersionId,
      sequenceVersionId
    });
    assert.equal(
      inheritedFromProject.bindings[0]?.creativeModuleVersionId,
      projectStyle.versionId
    );

    console.log("Creative inheritance smoke test passed.");
  } finally {
    await db.dependencyEdge.deleteMany({
      where: {
        OR: [
          {
            upstreamNodeId: {
              in: moduleDefinitions.map(({ nodeId }) => nodeId)
            }
          },
          {
            downstreamNodeId: {
              in: [projectNodeId, sequenceNodeId, shotNodeId]
            }
          }
        ]
      }
    });
    await db.creativeBinding.deleteMany({
      where: {
        scopeNodeId: {
          in: [projectNodeId, sequenceNodeId, shotNodeId]
        }
      }
    });
    await db.sequenceVersionShot.deleteMany({
      where: { sequenceVersionId }
    });
    await db.projectVersionSequence.deleteMany({
      where: { projectVersionId }
    });
    await db.shotVersion.deleteMany({ where: { shotId } });
    await db.shot.deleteMany({ where: { id: shotId } });
    await db.sequenceVersion.deleteMany({ where: { sequenceId } });
    await db.sequence.deleteMany({ where: { id: sequenceId } });
    await db.projectVersion.deleteMany({ where: { projectId } });
    await db.project.deleteMany({ where: { id: projectId } });
    await db.creativeModuleVersion.deleteMany({
      where: {
        id: {
          in: moduleDefinitions.map(({ versionId }) => versionId)
        }
      }
    });
    await db.creativeModule.deleteMany({
      where: {
        id: {
          in: moduleDefinitions.map(({ id }) => id)
        }
      }
    });
    await db.domainVersionNode.deleteMany({
      where: {
        id: {
          in: [
            projectNodeId,
            sequenceNodeId,
            shotNodeId,
            ...moduleDefinitions.map(({ nodeId }) => nodeId)
          ]
        }
      }
    });
    await db.workspace.deleteMany({
      where: {
        id: { in: [workspaceId, otherWorkspaceId] }
      }
    });
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
