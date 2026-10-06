import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AssetKind,
  AssetStatus,
  DomainVersionKind,
  MusicMapAnchorDecision,
  MusicMapAnchorKind,
  VersionLifecycle,
  WizardStepStatus,
  WorkspaceRole
} from "@prisma/client";
import { db } from "../src/lib/db";
import { lockVersionNode } from "../src/lib/dependency-graph/version-lock";
import { musicAnalysisResultSchema } from "../src/lib/music-analysis/result";
import {
  completeMusicMap,
  createMusicMapAnchor,
  decidePendingMusicMapAnchors,
  initializeMusicMap,
  lockMusicMap,
  updateMusicMapAnchor,
  updateMusicMapGrid
} from "../src/lib/music-map/service";
import {
  ensureWizardProgress,
  WizardLockedError
} from "../src/lib/wizard/service";

async function main() {
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  const projectVersionId = randomUUID();
  const projectNodeId = randomUUID();
  const assetId = randomUUID();
  const audioVersionId = randomUUID();
  const audioNodeId = randomUUID();
  const analysisId = randomUUID();
  const analysisVersionId = randomUUID();
  const analysisNodeId = randomUUID();

  const beatsMs = Array.from({ length: 120 }, (_, index) => index * 500);
  const barsMs = Array.from({ length: 30 }, (_, index) => index * 2000);
  const result = musicAnalysisResultSchema.parse({
    schemaVersion: 1,
    analyzer: {
      engine: "librosa",
      version: "1.0.0",
      sampleRate: 22050,
      hopLength: 512
    },
    durationMs: 60000,
    waveform: [],
    tempo: {
      bpm: 120,
      confidence: 0.9,
      beatCount: beatsMs.length
    },
    beatsMs,
    barCandidates: {
      meter: "4/4",
      phase: 0,
      confidence: 0.8,
      barsMs
    },
    energyCurve: [],
    sections: [
      {
        index: 0,
        label: "section-1",
        startMs: 0,
        endMs: 30000,
        meanEnergy: 0.4
      },
      {
        index: 1,
        label: "section-2",
        startMs: 30000,
        endMs: 60000,
        meanEnergy: 0.8
      }
    ],
    structuralChanges: [
      {
        timeMs: 30000,
        score: 0.88,
        kind: "section-boundary"
      }
    ],
    drops: [
      {
        timeMs: 30000,
        score: 0.92,
        preEnergy: 0.35,
        postEnergy: 0.85
      }
    ],
    introCandidate: {
      startMs: 0,
      endMs: 5000,
      basis: "first-estimated-section"
    },
    outroCandidate: {
      startMs: 55000,
      endMs: 60000,
      basis: "last-estimated-section"
    },
    transitionCandidates: [
      {
        timeMs: 30000,
        score: 0.95,
        reasons: ["section-boundary", "energy-drop"]
      }
    ],
    transcript: null,
    vocalPassages: [],
    instrumentalBreakCandidates: []
  });

  try {
    await db.user.create({
      data: {
        id: userId,
        email: "map-" + userId + "@example.test",
        displayName: "Music Map Smoke"
      }
    });
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Music Map Smoke Workspace",
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
        title: "Music Map Smoke Project"
      }
    });
    await db.domainVersionNode.createMany({
      data: [
        { id: projectNodeId, kind: DomainVersionKind.PROJECT },
        { id: audioNodeId, kind: DomainVersionKind.ASSET },
        { id: analysisNodeId, kind: DomainVersionKind.MUSIC_ANALYSIS }
      ]
    });
    await db.asset.create({
      data: {
        id: assetId,
        workspaceId,
        projectId,
        kind: AssetKind.AUDIO_MASTER,
        name: "map-smoke.wav"
      }
    });
    await db.assetVersion.create({
      data: {
        id: audioVersionId,
        assetId,
        nodeId: audioNodeId,
        versionNumber: 1,
        status: AssetStatus.READY,
        storageKey: "map-smoke/" + audioVersionId + ".wav",
        contentType: "audio/wav",
        durationMs: 60000,
        readyAt: new Date()
      }
    });
    await db.projectVersion.create({
      data: {
        id: projectVersionId,
        projectId,
        nodeId: projectNodeId,
        versionNumber: 1,
        title: "Music Map Smoke Project",
        aspectRatio: "16:9",
        outputWidth: 1920,
        outputHeight: 1080,
        frameRate: 24,
        audioMasterAssetVersionId: audioVersionId
      }
    });
    await ensureWizardProgress({ userId, projectId });

    await db.musicAnalysis.create({
      data: {
        id: analysisId,
        projectId
      }
    });
    await db.musicAnalysisVersion.create({
      data: {
        id: analysisVersionId,
        musicAnalysisId: analysisId,
        nodeId: analysisNodeId,
        versionNumber: 1,
        lifecycle: VersionLifecycle.LOCKED,
        audioAssetVersionId: audioVersionId,
        engineKey: "librosa",
        engineVersion: "1.0.0",
        durationMs: 60000,
        result,
        createdByUserId: userId,
        lockedAt: new Date()
      }
    });

    let map = await initializeMusicMap({ userId, projectId });
    assert.equal(map.versionNumber, 1);
    assert.equal(map.sourceAnalysisVersionId, analysisVersionId);
    assert.equal(map.beatGridSource, "analysis");
    assert.equal(map.beatGridMs.length, beatsMs.length);
    assert.ok(map.anchors.length >= 6);

    const dependency = await db.dependencyEdge.findFirst({
      where: {
        upstreamNodeId: analysisNodeId,
        downstreamNodeId: map.nodeId,
        relation: "DERIVED_FROM"
      }
    });
    assert.ok(dependency);

    const section = map.anchors.find(
      (anchor) => anchor.kind === MusicMapAnchorKind.SECTION
    );
    assert.ok(section);

    map = await updateMusicMapAnchor({
      userId,
      projectId,
      mapVersionId: map.id,
      anchorId: section!.id,
      expectedRevision: map.revision,
      label: "Verse",
      startMs: 500,
      endMs: 29500,
      decision: MusicMapAnchorDecision.ACCEPTED
    });

    const updatedSection = map.anchors.find(
      (anchor) => anchor.id === section!.id
    );
    assert.equal(updatedSection?.label, "Verse");
    assert.equal(updatedSection?.sourceStartMs, 0);
    assert.equal(updatedSection?.startMs, 500);

    const progress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    const brief = progress.steps.find(
      (step) => step.stepKey === "creative-brief"
    );
    assert.ok(brief);
    await db.wizardStepState.update({
      where: { id: brief!.id },
      data: {
        status: WizardStepStatus.COMPLETED,
        payload: { brief: true },
        completedAt: new Date()
      }
    });

    map = await createMusicMapAnchor({
      userId,
      projectId,
      mapVersionId: map.id,
      expectedRevision: map.revision,
      kind: MusicMapAnchorKind.CUSTOM,
      label: "Hard visual reset",
      startMs: 42000,
      endMs: null
    });

    const invalidatedBrief = await db.wizardStepState.findUniqueOrThrow({
      where: { id: brief!.id }
    });
    assert.equal(
      invalidatedBrief.status,
      WizardStepStatus.NEEDS_REVIEW
    );
    assert.match(
      invalidatedBrief.reviewReason ?? "",
      /Music map/i
    );

    map = await updateMusicMapGrid({
      userId,
      projectId,
      mapVersionId: map.id,
      expectedRevision: map.revision,
      mode: "manual-tempo",
      tempoBpm: 100,
      meterNumerator: 3,
      meterDenominator: 4,
      beatOffsetMs: 250,
      barPhase: 1
    });
    assert.equal(map.beatGridSource, "manual-tempo");
    assert.equal(map.meterNumerator, 3);
    assert.equal(map.barPhase, 1);
    assert.equal(map.beatGridMs[0], 250);
    assert.ok(map.barGridMs.length > 0);

    map = await decidePendingMusicMapAnchors({
      userId,
      projectId,
      mapVersionId: map.id,
      expectedRevision: map.revision,
      decision: "REJECTED"
    });
    assert.equal(
      map.anchors.filter(
        (anchor) => anchor.decision === MusicMapAnchorDecision.PENDING
      ).length,
      0
    );
    assert.ok(
      map.anchors.some(
        (anchor) =>
          anchor.source === "ANALYSIS" &&
          anchor.decision === MusicMapAnchorDecision.REJECTED
      )
    );
    assert.ok(
      map.anchors.some(
        (anchor) =>
          anchor.source === "USER" &&
          anchor.decision === MusicMapAnchorDecision.ACCEPTED
      )
    );

    map = await completeMusicMap({
      userId,
      projectId,
      mapVersionId: map.id,
      expectedRevision: map.revision
    });
    const completedProgress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    assert.equal(
      completedProgress.steps.find((step) => step.stepKey === "music-map")
        ?.status,
      WizardStepStatus.COMPLETED
    );

    map = await lockMusicMap({
      userId,
      projectId,
      mapVersionId: map.id,
      expectedRevision: map.revision
    });
    assert.equal(map.lifecycle, VersionLifecycle.LOCKED);

    const lockedProgress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    assert.ok(
      lockedProgress.steps.find((step) => step.stepKey === "music-map")
        ?.lockedAt
    );

    const genericLock = await lockVersionNode(map.nodeId);
    assert.equal(genericLock.alreadyLocked, true);

    await assert.rejects(
      () =>
        updateMusicMapGrid({
          userId,
          projectId,
          mapVersionId: map.id,
          expectedRevision: map.revision,
          mode: "analysis"
        }),
      WizardLockedError
    );

    const fingerprint = await db.domainVersionNode.findUniqueOrThrow({
      where: { id: map.nodeId },
      select: { fingerprint: true }
    });
    assert.ok(fingerprint.fingerprint);

    console.log("Music Map smoke test passed.");
  } finally {
    const mapVersions = await db.musicMapVersion.findMany({
      where: {
        musicMap: { projectId }
      },
      select: { id: true, nodeId: true }
    });
    const mapNodeIds = mapVersions.map((item) => item.nodeId);

    await db.musicMapVersion.deleteMany({
      where: { id: { in: mapVersions.map((item) => item.id) } }
    });
    await db.musicMap.deleteMany({ where: { projectId } });
    await db.musicAnalysisVersion.deleteMany({
      where: { musicAnalysisId: analysisId }
    });
    await db.musicAnalysis.deleteMany({ where: { id: analysisId } });
    await db.projectVersion.deleteMany({ where: { projectId } });
    await db.assetVersion.deleteMany({ where: { assetId } });
    await db.asset.deleteMany({ where: { id: assetId } });
    await db.domainVersionNode.deleteMany({
      where: {
        id: {
          in: [
            projectNodeId,
            audioNodeId,
            analysisNodeId,
            ...mapNodeIds
          ]
        }
      }
    });
    await db.project.deleteMany({ where: { id: projectId } });
    await db.workspace.deleteMany({ where: { id: workspaceId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
