import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  CreativeModuleKind,
  DomainVersionKind,
  WorkspaceRole
} from "@prisma/client";
import { db } from "../src/lib/db";
import {
  createCreativeModule,
  publishCreativeModuleVersion
} from "../src/lib/creative-library/service";
import {
  applyCreativeKitVersion,
  createCreativeKit,
  createCreativeKitVersion,
  publishCreativeKitVersion
} from "../src/lib/creative-kits/service";
import { EMPTY_VISUAL_AESTHETIC } from "../src/lib/visual-aesthetic/schema";

async function main() {
  const userId = randomUUID();
  const email = "creative-kit-" + userId + "@example.test";
  let workspaceId: string | null = null;
  const projectId = randomUUID();
  const projectVersionId = randomUUID();
  const projectNodeId = randomUUID();
  const createdNodeIds: string[] = [];

  try {
    const user = await db.user.create({
      data: {
        id: userId,
        email,
        displayName: "Creative Kit Smoke",
        memberships: {
          create: {
            role: WorkspaceRole.OWNER,
            workspace: { create: { name: "Creative Kit Smoke Workspace" } }
          }
        }
      },
      include: {
        memberships: {
          select: { workspaceId: true },
          take: 1
        }
      }
    });
    workspaceId = user.memberships[0]?.workspaceId ?? null;
    assert.ok(workspaceId);

    const visual = await createCreativeModule({
      userId,
      displayName: "Creative Kit Smoke",
      metadata: {
        kind: CreativeModuleKind.VISUAL_AESTHETIC,
        name: "Noir grain",
        description: "High contrast visual system",
        tags: ["noir"]
      },
      version: {
        definition: {
          ...EMPTY_VISUAL_AESTHETIC,
          medium: "silver gelatin film",
          texture: "Dense analog emulsion with tactile photographic grain.",
          colorTreatment: "Strict monochrome silver-gelatin tonality.",
          palette: [
            { name: "paper white", hex: "#E9E9E6" },
            { name: "silver gray", hex: "#787A7D" },
            { name: "deep black", hex: "#111214" }
          ],
          saturation: "MONOCHROME",
          contrast: "HIGH",
          grain: "heavy",
          lighting: {
            ...EMPTY_VISUAL_AESTHETIC.lighting,
            quality: "Hard sculptural key light with controlled fill.",
            shadowCharacter: "Dense blacks with readable edge detail."
          },
          renderingCharacteristics:
            "Silver-gelatin density with soft highlight bloom and no digital gloss."
        },
        positivePrompt: "silver gelatin",
        negativePrompt: "digital gloss",
        notes: "",
        referenceAssetVersionIds: []
      }
    });
    createdNodeIds.push(visual.nodeId);
    await publishCreativeModuleVersion({
      userId,
      displayName: "Creative Kit Smoke",
      moduleId: visual.moduleId,
      versionId: visual.versionId
    });

    const motion = await createCreativeModule({
      userId,
      displayName: "Creative Kit Smoke",
      metadata: {
        kind: CreativeModuleKind.MOTION_GRAMMAR,
        name: "Predatory handheld",
        description: "Controlled pursuit movement",
        tags: ["handheld"]
      },
      version: {
        definition: { movement: "handheld" },
        positivePrompt: "controlled handheld pursuit",
        negativePrompt: "random shake",
        notes: "",
        referenceAssetVersionIds: []
      }
    });
    createdNodeIds.push(motion.nodeId);
    await publishCreativeModuleVersion({
      userId,
      displayName: "Creative Kit Smoke",
      moduleId: motion.moduleId,
      versionId: motion.versionId
    });

    const kit = await createCreativeKit({
      userId,
      displayName: "Creative Kit Smoke",
      metadata: {
        name: "Noir pursuit",
        description: "Reusable noir pursuit system",
        tags: ["noir", "pursuit"]
      },
      version: {
        items: [
          {
            slot: "visual-aesthetic",
            creativeModuleVersionId: visual.versionId
          },
          {
            slot: "camera-motion",
            creativeModuleVersionId: motion.versionId
          }
        ],
        notes: "Smoke kit"
      }
    });
    createdNodeIds.push(kit.nodeId);

    await publishCreativeKitVersion({
      userId,
      displayName: "Creative Kit Smoke",
      kitId: kit.kitId,
      versionId: kit.versionId
    });

    const reordered = await createCreativeKitVersion({
      userId,
      displayName: "Creative Kit Smoke",
      kitId: kit.kitId,
      version: {
        items: [
          {
            slot: "camera-motion",
            creativeModuleVersionId: motion.versionId
          },
          {
            slot: "visual-aesthetic",
            creativeModuleVersionId: visual.versionId
          }
        ],
        notes: "Same semantics, different display order"
      }
    });
    createdNodeIds.push(reordered.nodeId);

    const fingerprints = await db.domainVersionNode.findMany({
      where: { id: { in: [kit.nodeId, reordered.nodeId] } },
      select: { id: true, fingerprint: true }
    });
    assert.equal(fingerprints.length, 2);
    assert.equal(fingerprints[0]?.fingerprint, fingerprints[1]?.fingerprint);

    await db.project.create({
      data: {
        id: projectId,
        workspaceId,
        title: "Kit application project"
      }
    });
    await db.domainVersionNode.create({
      data: {
        id: projectNodeId,
        kind: DomainVersionKind.PROJECT
      }
    });
    createdNodeIds.push(projectNodeId);
    await db.projectVersion.create({
      data: {
        id: projectVersionId,
        projectId,
        nodeId: projectNodeId,
        versionNumber: 1,
        title: "Kit application project"
      }
    });

    const applied = await applyCreativeKitVersion({
      userId,
      displayName: "Creative Kit Smoke",
      kitId: kit.kitId,
      versionId: kit.versionId,
      scopeNodeId: projectNodeId,
      mode: "overwrite"
    });
    assert.deepEqual(applied.appliedSlots, [
      "visual-aesthetic",
      "camera-motion"
    ]);

    const bindings = await db.creativeBinding.findMany({
      where: { scopeNodeId: projectNodeId },
      orderBy: { slot: "asc" }
    });
    assert.equal(bindings.length, 2);

    const filled = await applyCreativeKitVersion({
      userId,
      displayName: "Creative Kit Smoke",
      kitId: kit.kitId,
      versionId: kit.versionId,
      scopeNodeId: projectNodeId,
      mode: "fill-empty"
    });
    assert.equal(filled.appliedSlots.length, 0);
    assert.equal(filled.skippedSlots.length, 2);

    const kitEdges = await db.dependencyEdge.count({
      where: {
        downstreamNodeId: kit.nodeId,
        relation: "REFERENCES"
      }
    });
    assert.equal(kitEdges, 2);

    console.log("Creative Kit smoke test passed.");
  } finally {
    await db.creativeBinding.deleteMany({
      where: { scopeNodeId: projectNodeId }
    });
    if (createdNodeIds.length > 0) {
      await db.dependencyEdge.deleteMany({
        where: {
          OR: [
            { upstreamNodeId: { in: createdNodeIds } },
            { downstreamNodeId: { in: createdNodeIds } }
          ]
        }
      });
    }

    if (workspaceId) {
      const kitVersions = await db.creativeKitVersion.findMany({
        where: { creativeKit: { workspaceId } },
        select: { id: true, nodeId: true }
      });
      await db.creativeKitItem.deleteMany({
        where: {
          creativeKitVersionId: {
            in: kitVersions.map(({ id }) => id)
          }
        }
      });
      await db.creativeKitVersion.deleteMany({
        where: { id: { in: kitVersions.map(({ id }) => id) } }
      });
      await db.creativeKit.deleteMany({ where: { workspaceId } });

      await db.projectVersion.deleteMany({ where: { projectId } });
      await db.project.deleteMany({ where: { id: projectId } });

      const libraryVersions = await db.creativeModuleVersion.findMany({
        where: { creativeModule: { workspaceId } },
        select: { id: true, nodeId: true, creativeModuleId: true }
      });
      await db.creativeModuleReference.deleteMany({
        where: {
          creativeModuleVersionId: {
            in: libraryVersions.map(({ id }) => id)
          }
        }
      });
      await db.creativeModuleVersion.deleteMany({
        where: { id: { in: libraryVersions.map(({ id }) => id) } }
      });
      await db.creativeModule.deleteMany({
        where: {
          id: {
            in: [
              ...new Set(
                libraryVersions.map(
                  ({ creativeModuleId }) => creativeModuleId
                )
              )
            ]
          }
        }
      });

      const allVersionNodeIds = [
        ...kitVersions.map(({ nodeId }) => nodeId),
        ...libraryVersions.map(({ nodeId }) => nodeId),
        projectNodeId
      ];
      await db.domainVersionNode.deleteMany({
        where: { id: { in: allVersionNodeIds } }
      });
      await db.workspace.deleteMany({ where: { id: workspaceId } });
    }

    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
