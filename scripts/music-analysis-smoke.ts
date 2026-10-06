import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  AssetKind,
  AssetStatus,
  DomainVersionKind,
  GenerationKind,
  GenerationStatus,
  WorkspaceRole
} from "@prisma/client";
import { db } from "../src/lib/db";
import { ensureWizardProgress } from "../src/lib/wizard/service";
import { runLibrosaMusicAnalysis } from "../src/lib/music-analysis/runner";
import {
  MUSIC_ANALYSIS_PROVIDER_KEY,
  persistMusicAnalysisResult,
  type QueuedMusicAnalysisRequest
} from "../src/lib/music-analysis/service";

function writeAscii(buffer: Buffer, offset: number, text: string) {
  buffer.write(text, offset, "ascii");
}

function createSyntheticSongWav(): Buffer {
  const sampleRate = 22050;
  const durationSeconds = 24;
  const samples = sampleRate * durationSeconds;
  const pcm = Buffer.alloc(samples * 2);

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const sectionGain = time < 8 ? 0.18 : time < 16 ? 0.55 : 0.32;
    let value =
      sectionGain *
      (0.55 * Math.sin(2 * Math.PI * 220 * time) +
        0.25 * Math.sin(2 * Math.PI * 330 * time));

    // 120 BPM: one click every 0.5 seconds.
    const beatPhase = time % 0.5;
    if (beatPhase < 0.018) {
      value += 0.8 * Math.exp(-beatPhase * 150);
    }

    const sample = Math.max(-1, Math.min(1, value));
    pcm.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  writeAscii(header, 0, "RIFF");
  header.writeUInt32LE(36 + pcm.length, 4);
  writeAscii(header, 8, "WAVE");
  writeAscii(header, 12, "fmt ");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  writeAscii(header, 36, "data");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "music-analysis-smoke-")
  );
  const sourcePath = path.join(tempDir, "synthetic.wav");
  const resultPath = path.join(tempDir, "result.json");

  const userId = randomUUID();
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const projectVersionId = randomUUID();
  const projectNodeId = randomUUID();
  const assetId = randomUUID();
  const audioVersionId = randomUUID();
  const audioNodeId = randomUUID();
  const jobId = randomUUID();

  try {
    await writeFile(sourcePath, createSyntheticSongWav());

    const result = await runLibrosaMusicAnalysis(sourcePath, {
      pythonExecutable: process.env.AUDIO_ANALYSIS_PYTHON ?? "python",
      ffmpegExecutable: process.env.AUDIO_ANALYSIS_FFMPEG ?? "ffmpeg",
      outputPath: resultPath
    });

    assert.ok(result.durationMs >= 23_500 && result.durationMs <= 24_500);
    assert.ok(result.waveform.length >= 100);
    assert.ok(result.energyCurve.length > 100);
    assert.ok(result.tempo.beatCount >= 24);
    assert.ok(
      result.tempo.bpm >= 90 && result.tempo.bpm <= 140,
      "Expected a plausible tempo near the synthetic 120 BPM pulse."
    );
    assert.ok(result.sections.length >= 2);
    assert.ok(result.transitionCandidates.length > 0);

    await db.user.create({
      data: {
        id: userId,
        email: "analysis-" + userId + "@example.test",
        displayName: "Analysis Smoke"
      }
    });
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Analysis Smoke Workspace",
        memberships: {
          create: {
            userId,
            role: WorkspaceRole.OWNER
          }
        }
      }
    });
    await db.project.create({
      data: {
        id: projectId,
        workspaceId,
        title: "Synthetic analysis project"
      }
    });
    await db.domainVersionNode.createMany({
      data: [
        { id: projectNodeId, kind: DomainVersionKind.PROJECT },
        { id: audioNodeId, kind: DomainVersionKind.ASSET }
      ]
    });
    await db.asset.create({
      data: {
        id: assetId,
        workspaceId,
        projectId,
        kind: AssetKind.AUDIO_MASTER,
        name: "synthetic.wav"
      }
    });
    await db.assetVersion.create({
      data: {
        id: audioVersionId,
        assetId,
        nodeId: audioNodeId,
        versionNumber: 1,
        status: AssetStatus.READY,
        storageKey: "smoke/synthetic.wav",
        contentType: "audio/wav",
        readyAt: new Date()
      }
    });
    await db.projectVersion.create({
      data: {
        id: projectVersionId,
        projectId,
        nodeId: projectNodeId,
        versionNumber: 1,
        title: "Synthetic analysis project",
        aspectRatio: "16:9",
        outputWidth: 1920,
        outputHeight: 1080,
        frameRate: 24,
        audioMasterAssetVersionId: audioVersionId
      }
    });
    await ensureWizardProgress({ userId, projectId });

    const request: QueuedMusicAnalysisRequest = {
      projectId,
      projectVersionId,
      audioAssetVersionId: audioVersionId,
      includeLyrics: false,
      transcriptionProvider: "none",
      transcriptionModel: null
    };

    await db.generationJob.create({
      data: {
        id: jobId,
        workspaceId,
        projectId,
        kind: GenerationKind.ANALYSIS,
        status: GenerationStatus.RUNNING,
        providerKey: MUSIC_ANALYSIS_PROVIDER_KEY,
        modelKey: "librosa-1.0.0",
        requestSnapshot: request,
        requestedByUserId: userId
      }
    });

    const persisted = await persistMusicAnalysisResult({
      generationJobId: jobId,
      request,
      result,
      requestedByUserId: userId
    });

    assert.equal(persisted.versionNumber, 1);
    const stored = await db.musicAnalysisVersion.findUniqueOrThrow({
      where: { id: persisted.analysisVersionId }
    });
    assert.equal(stored.durationMs, result.durationMs);
    assert.equal(stored.lifecycle, "LOCKED");

    const edge = await db.dependencyEdge.findFirst({
      where: {
        upstreamNodeId: audioNodeId,
        downstreamNodeId: persisted.analysisNodeId,
        relation: "DERIVED_FROM"
      }
    });
    assert.ok(edge);

    const output = await db.generationOutput.findFirst({
      where: {
        jobId,
        nodeId: persisted.analysisNodeId,
        role: "music-analysis"
      }
    });
    assert.ok(output);

    const progress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    const analysisStep = progress.steps.find(
      (step) => step.stepKey === "music-analysis"
    );
    assert.equal(analysisStep?.status, "COMPLETED");

    const audio = await db.assetVersion.findUniqueOrThrow({
      where: { id: audioVersionId }
    });
    assert.equal(audio.durationMs, result.durationMs);

    console.log("Music analysis smoke test passed.");
  } finally {
    const analysisVersions = await db.musicAnalysisVersion.findMany({
      where: {
        musicAnalysis: { projectId }
      },
      select: { id: true, nodeId: true }
    });
    const analysisNodeIds = analysisVersions.map((item) => item.nodeId);

    await db.generationOutput.deleteMany({ where: { jobId } });
    await db.dependencyEdge.deleteMany({
      where: {
        OR: [
          { upstreamNodeId: { in: [audioNodeId, ...analysisNodeIds] } },
          { downstreamNodeId: { in: [audioNodeId, ...analysisNodeIds] } }
        ]
      }
    });
    await db.musicAnalysisVersion.deleteMany({
      where: { id: { in: analysisVersions.map((item) => item.id) } }
    });
    await db.musicAnalysis.deleteMany({ where: { projectId } });
    await db.generationJob.deleteMany({ where: { id: jobId } });
    await db.projectVersion.deleteMany({ where: { projectId } });
    await db.assetVersion.deleteMany({ where: { assetId } });
    await db.asset.deleteMany({ where: { id: assetId } });
    await db.domainVersionNode.deleteMany({
      where: {
        id: {
          in: [projectNodeId, audioNodeId, ...analysisNodeIds]
        }
      }
    });
    await db.project.deleteMany({ where: { id: projectId } });
    await db.workspace.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
