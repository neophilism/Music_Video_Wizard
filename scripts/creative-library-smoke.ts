import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CreativeModuleKind, WorkspaceRole } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  createCreativeModule,
  createCreativeModuleVersion,
  getCreativeModule,
  listCreativeModules,
  publishCreativeModuleVersion
} from "../src/lib/creative-library/service";

async function main() {
  const userId = randomUUID();
  const email = "creative-library-" + userId + "@example.test";
  let workspaceId: string | null = null;

  try {
    const user = await db.user.create({
      data: {
        id: userId,
        email,
        displayName: "Creative Library Smoke",
        memberships: {
          create: {
            role: WorkspaceRole.OWNER,
            workspace: { create: { name: "Creative Library Smoke Workspace" } }
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

    const created = await createCreativeModule({
      userId,
      displayName: "Creative Library Smoke",
      metadata: {
        kind: CreativeModuleKind.VISUAL_AESTHETIC,
        name: "Silver nitrate dream",
        description: "Monochrome film grammar",
        tags: ["film", "monochrome"]
      },
      version: {
        definition: { contrast: "high", grain: "heavy" },
        positivePrompt: "silver gelatin texture",
        negativePrompt: "digital gloss",
        notes: "Smoke test",
        referenceAssetVersionIds: []
      }
    });

    assert.equal(created.versionNumber, 1);

    const published = await publishCreativeModuleVersion({
      userId,
      displayName: "Creative Library Smoke",
      moduleId: created.moduleId,
      versionId: created.versionId
    });
    assert.equal(published.versionNumber, 1);

    const next = await createCreativeModuleVersion({
      userId,
      displayName: "Creative Library Smoke",
      moduleId: created.moduleId,
      version: {
        definition: { contrast: "high", grain: "medium" },
        positivePrompt: "silver gelatin texture",
        negativePrompt: "digital gloss",
        notes: "Refined grain",
        referenceAssetVersionIds: []
      }
    });
    assert.equal(next.versionNumber, 2);

    const detail = await getCreativeModule({
      userId,
      displayName: "Creative Library Smoke",
      moduleId: created.moduleId
    });
    assert.equal(detail?.versions.length, 2);
    assert.equal(detail?.versions[0]?.versionNumber, 2);
    assert.equal(detail?.versions[1]?.lifecycle, "LOCKED");

    const search = await listCreativeModules({
      userId,
      displayName: "Creative Library Smoke",
      query: "monochrome"
    });
    assert.equal(search.length, 1);
    assert.equal(search[0]?.id, created.moduleId);

    console.log("Creative Library smoke test passed.");
  } finally {
    if (workspaceId) {
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
