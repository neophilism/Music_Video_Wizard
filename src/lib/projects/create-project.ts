import { createHash, randomUUID } from "node:crypto";
import {
  AssetKind,
  AssetStatus,
  DependencyRelation,
  DomainVersionKind
} from "@prisma/client";
import { db } from "@/lib/db";
import { registerDependencyEdgeInTransaction } from "@/lib/dependency-graph/service";
import { getEnvironment } from "@/lib/env";
import { ensurePersonalWorkspace } from "@/lib/workspaces";
import { createAssetStorage } from "@/lib/storage";
import { aspectRatioPresets, type ProjectCreationInput } from "./project-input";
import { validateAudioBytes } from "./audio-upload";

export interface CreateProjectAudioInput {
  originalFileName: string;
  bytes: Uint8Array;
}

export interface CreateProjectWithAudioInput {
  userId: string;
  displayName: string;
  project: ProjectCreationInput;
  audio: CreateProjectAudioInput;
}

export interface CreatedProject {
  projectId: string;
  projectVersionId: string;
  audioAssetVersionId: string;
}

export async function createProjectWithAudio(
  input: CreateProjectWithAudioInput
): Promise<CreatedProject> {
  const env = getEnvironment();
  const workspace = await ensurePersonalWorkspace(input.userId, input.displayName);
  const audioInfo = validateAudioBytes(
    input.audio.bytes,
    env.MAX_AUDIO_UPLOAD_BYTES
  );
  const dimensions = aspectRatioPresets[input.project.aspectRatio];
  const storage = createAssetStorage(env);

  const projectId = randomUUID();
  const projectVersionId = randomUUID();
  const projectNodeId = randomUUID();
  const audioAssetId = randomUUID();
  const audioAssetVersionId = randomUUID();
  const audioNodeId = randomUUID();
  const storageKey = [
    "workspaces",
    workspace.id,
    "projects",
    projectId,
    "audio",
    `${audioAssetVersionId}.${audioInfo.extension}`
  ].join("/");

  const checksumSha256 = createHash("sha256")
    .update(input.audio.bytes)
    .digest("hex");

  await storage.put({
    key: storageKey,
    body: input.audio.bytes,
    contentType: audioInfo.contentType
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.project.create({
        data: {
          id: projectId,
          workspaceId: workspace.id,
          title: input.project.title,
          description: input.project.description || null
        }
      });

      await tx.domainVersionNode.create({
        data: {
          id: audioNodeId,
          kind: DomainVersionKind.ASSET,
          fingerprint: checksumSha256
        }
      });

      await tx.asset.create({
        data: {
          id: audioAssetId,
          workspaceId: workspace.id,
          projectId,
          kind: AssetKind.AUDIO_MASTER,
          name: input.audio.originalFileName
        }
      });

      await tx.assetVersion.create({
        data: {
          id: audioAssetVersionId,
          assetId: audioAssetId,
          nodeId: audioNodeId,
          versionNumber: 1,
          status: AssetStatus.READY,
          storageKey,
          contentType: audioInfo.contentType,
          byteSize: BigInt(input.audio.bytes.byteLength),
          checksumSha256,
          metadata: {
            originalFileName: input.audio.originalFileName,
            container: audioInfo.container
          },
          createdByUserId: input.userId,
          readyAt: new Date()
        }
      });

      await tx.domainVersionNode.create({
        data: {
          id: projectNodeId,
          kind: DomainVersionKind.PROJECT
        }
      });

      await tx.projectVersion.create({
        data: {
          id: projectVersionId,
          projectId,
          nodeId: projectNodeId,
          versionNumber: 1,
          branchName: "Main",
          title: input.project.title,
          description: input.project.description || null,
          aspectRatio: input.project.aspectRatio,
          outputWidth: dimensions.width,
          outputHeight: dimensions.height,
          frameRate: input.project.frameRate,
          audioMasterAssetVersionId: audioAssetVersionId,
          specification: {
            audioMaster: {
              immutable: true,
              originalFileName: input.audio.originalFileName
            }
          },
          createdByUserId: input.userId
        }
      });

      await tx.project.update({
        where: { id: projectId },
        data: { activeProjectVersionId: projectVersionId }
      });

      await registerDependencyEdgeInTransaction(tx, {
        upstreamNodeId: audioNodeId,
        downstreamNodeId: projectNodeId,
        relation: DependencyRelation.REFERENCES,
        reason: "Project version pins its immutable master audio asset version."
      });
    });
  } catch (databaseError) {
    try {
      await storage.delete(storageKey);
    } catch (cleanupError) {
      throw new AggregateError(
        [databaseError, cleanupError],
        "Project creation failed and uploaded audio cleanup also failed."
      );
    }

    throw databaseError;
  }

  return {
    projectId,
    projectVersionId,
    audioAssetVersionId
  };
}
