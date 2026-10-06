import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AssetKind,
  AssetStatus,
  DomainVersionKind,
  MusicMapAnchorDecision,
  MusicMapAnchorKind,
  MusicMapAnchorSource,
  VersionLifecycle,
  WizardStepStatus,
  WorkspaceRole
} from "@prisma/client";
import { db } from "../src/lib/db";
import { lockVersionNode } from "../src/lib/dependency-graph/version-lock";
import {
  completeCreativeBrief,
  CreativeBriefError,
  getCreativeBriefState,
  initializeCreativeBrief,
  lockCreativeBrief,
  reopenCreativeBrief,
  saveCreativeBrief
} from "../src/lib/creative-brief/service";
import { EMPTY_CREATIVE_BRIEF } from "../src/lib/creative-brief/input";
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
  const mapId = randomUUID();
  const mapVersionId = randomUUID();
  const mapNodeId = randomUUID();

  try {
    await db.user.create({
      data: {
        id: userId,
        email: "brief-" + userId + "@example.test",
        displayName: "Creative Brief Smoke"
      }
    });
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Creative Brief Smoke Workspace",
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
        title: "Creative Brief Smoke Project"
      }
    });

    await db.domainVersionNode.createMany({
      data: [
        { id: projectNodeId, kind: DomainVersionKind.PROJECT },
        { id: audioNodeId, kind: DomainVersionKind.ASSET },
        {
          id: analysisNodeId,
          kind: DomainVersionKind.MUSIC_ANALYSIS
        },
        { id: mapNodeId, kind: DomainVersionKind.MUSIC_MAP }
      ]
    });

    await db.asset.create({
      data: {
        id: assetId,
        workspaceId,
        projectId,
        kind: AssetKind.AUDIO_MASTER,
        name: "brief-smoke.wav"
      }
    });
    await db.assetVersion.create({
      data: {
        id: audioVersionId,
        assetId,
        nodeId: audioNodeId,
        versionNumber: 1,
        status: AssetStatus.READY,
        storageKey: "brief-smoke/" + audioVersionId + ".wav",
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
        title: "Creative Brief Smoke Project",
        aspectRatio: "16:9",
        outputWidth: 1920,
        outputHeight: 1080,
        frameRate: 24,
        audioMasterAssetVersionId: audioVersionId
      }
    });

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
        engineKey: "test",
        engineVersion: "1",
        durationMs: 60000,
        result: {
          schemaVersion: 1,
          analyzer: {
            engine: "librosa",
            version: "1.0.0",
            sampleRate: 22050,
            hopLength: 512
          },
          durationMs: 60000,
          waveform: [],
          tempo: { bpm: 120, confidence: 1, beatCount: 120 },
          beatsMs: [],
          barCandidates: {
            meter: "4/4",
            phase: 0,
            confidence: 1,
            barsMs: []
          },
          energyCurve: [],
          sections: [],
          structuralChanges: [],
          drops: [],
          introCandidate: {
            startMs: 0,
            endMs: 4000,
            basis: "test"
          },
          outroCandidate: {
            startMs: 56000,
            endMs: 60000,
            basis: "test"
          },
          transitionCandidates: [],
          transcript: null,
          vocalPassages: [],
          instrumentalBreakCandidates: []
        },
        createdByUserId: userId,
        lockedAt: new Date()
      }
    });

    await db.musicMap.create({
      data: {
        id: mapId,
        projectId
      }
    });
    await db.musicMapVersion.create({
      data: {
        id: mapVersionId,
        musicMapId: mapId,
        nodeId: mapNodeId,
        versionNumber: 1,
        lifecycle: VersionLifecycle.LOCKED,
        sourceAnalysisVersionId: analysisVersionId,
        revision: 4,
        tempoBpm: 120,
        meterNumerator: 4,
        meterDenominator: 4,
        beatOffsetMs: 0,
        barPhase: 0,
        beatGridSource: "analysis",
        beatGridMs: [0, 500, 1000, 1500],
        barGridMs: [0],
        durationMs: 60000,
        createdByUserId: userId,
        lockedAt: new Date(),
        anchors: {
          create: [
            {
              kind: MusicMapAnchorKind.SECTION,
              source: MusicMapAnchorSource.USER,
              decision: MusicMapAnchorDecision.ACCEPTED,
              label: "Opening",
              startMs: 0,
              endMs: 30000,
              position: 0
            },
            {
              kind: MusicMapAnchorKind.DROP,
              source: MusicMapAnchorSource.USER,
              decision: MusicMapAnchorDecision.ACCEPTED,
              label: "Release",
              startMs: 30000,
              position: 1
            }
          ]
        }
      }
    });

    await ensureWizardProgress({ userId, projectId });

    let brief = await initializeCreativeBrief({ userId, projectId });
    assert.equal(brief.versionNumber, 1);
    assert.equal(brief.sourceMusicMapVersionId, mapVersionId);
    assert.equal(brief.lifecycle, VersionLifecycle.DRAFT);
    assert.deepEqual(brief.brief, EMPTY_CREATIVE_BRIEF);
    assert.equal(brief.sourceMusicMap.acceptedAnchors.length, 2);

    const edge = await db.dependencyEdge.findFirst({
      where: {
        upstreamNodeId: mapNodeId,
        downstreamNodeId: brief.nodeId,
        relation: "REFERENCES"
      }
    });
    assert.ok(edge);

    await assert.rejects(
      () =>
        completeCreativeBrief({
          userId,
          projectId,
          briefVersionId: brief.id,
          expectedRevision: brief.revision
        }),
      CreativeBriefError
    );

    const progress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    const concepts = progress.steps.find(
      (step) => step.stepKey === "concepts"
    );
    assert.ok(concepts);
    await db.wizardStepState.update({
      where: { id: concepts!.id },
      data: {
        status: WizardStepStatus.COMPLETED,
        payload: { touched: true },
        completedAt: new Date()
      }
    });

    const validDraft = {
      ...EMPTY_CREATIVE_BRIEF,
      objective:
        "Create an emotionally escalating video that earns a sense of liberation.",
      audience:
        "Adults who reward cinematic storytelling and close visual attention.",
      desiredFeelings: ["tension", "wonder", "release"],
      tone: ["serious", "kinetic", "humane"],
      contentMix: {
        narrative: 50,
        performance: 30,
        abstract: 20
      },
      literalMetaphoricalMode: "MOSTLY_METAPHORICAL" as const,
      literalMetaphoricalNotes:
        "Use concrete story events but allow images to carry symbolic meaning.",
      artistPresence: "PERFORMANCE" as const,
      artistPresenceNotes:
        "Performance should punctuate rather than interrupt the story.",
      visualDialogueMode: "COUNTERPOINT" as const,
      visualDialogueNotes:
        "Avoid simply illustrating lyrics; let images sometimes argue with them.",
      requiredImagery: ["a recurring open doorway"],
      avoidedImagery: ["generic nightclub imagery"],
      evolution:
        "Begin contained, fracture around the musical release, then open into wider spaces.",
      endingResolution:
        "Resolve with a concrete image of freedom without explaining every symbol.",
      recurringSymbols: ["doorway", "red thread"],
      culturalPeriodInfluences: ["late-1970s urban photography"],
      references: ["The visual economy of classic 35mm street photography"],
      constraints: ["No on-screen text"],
      notes: "Keep the central emotional line legible."
    };

    const saved = await saveCreativeBrief({
      userId,
      projectId,
      briefVersionId: brief.id,
      expectedRevision: brief.revision,
      payload: validDraft
    });
    brief = saved.version;
    assert.equal(brief.brief.objective, validDraft.objective);

    const invalidatedConcepts =
      await db.wizardStepState.findUniqueOrThrow({
        where: { id: concepts!.id }
      });
    assert.equal(
      invalidatedConcepts.status,
      WizardStepStatus.NEEDS_REVIEW
    );
    assert.match(
      invalidatedConcepts.reviewReason ?? "",
      /Creative brief/i
    );

    const completed = await completeCreativeBrief({
      userId,
      projectId,
      briefVersionId: brief.id,
      expectedRevision: brief.revision
    });
    brief = completed.version;

    let currentProgress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    assert.equal(
      currentProgress.steps.find(
        (step) => step.stepKey === "creative-brief"
      )?.status,
      WizardStepStatus.COMPLETED
    );

    const reopened = await reopenCreativeBrief({
      userId,
      projectId,
      briefVersionId: brief.id,
      expectedRevision: brief.revision
    });
    brief = reopened.version;
    currentProgress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    assert.equal(
      currentProgress.steps.find(
        (step) => step.stepKey === "creative-brief"
      )?.status,
      WizardStepStatus.IN_PROGRESS
    );

    const changedDraft = {
      ...brief.brief,
      endingResolution:
        brief.brief.endingResolution + " Hold the final image for emphasis."
    };
    brief = (
      await saveCreativeBrief({
        userId,
        projectId,
        briefVersionId: brief.id,
        expectedRevision: brief.revision,
        payload: changedDraft
      })
    ).version;

    brief = (
      await completeCreativeBrief({
        userId,
        projectId,
        briefVersionId: brief.id,
        expectedRevision: brief.revision
      })
    ).version;

    brief = (
      await lockCreativeBrief({
        userId,
        projectId,
        briefVersionId: brief.id,
        expectedRevision: brief.revision
      })
    ).version;
    assert.equal(brief.lifecycle, VersionLifecycle.LOCKED);

    const genericLock = await lockVersionNode(brief.nodeId);
    assert.equal(genericLock.alreadyLocked, true);

    await assert.rejects(
      () =>
        saveCreativeBrief({
          userId,
          projectId,
          briefVersionId: brief.id,
          expectedRevision: brief.revision,
          payload: changedDraft
        }),
      WizardLockedError
    );

    const fingerprint = await db.domainVersionNode.findUniqueOrThrow({
      where: { id: brief.nodeId },
      select: { fingerprint: true }
    });
    assert.ok(fingerprint.fingerprint);

    const mapNode2 = randomUUID();
    const mapVersion2 = randomUUID();
    await db.domainVersionNode.create({
      data: {
        id: mapNode2,
        kind: DomainVersionKind.MUSIC_MAP
      }
    });
    await db.musicMapVersion.create({
      data: {
        id: mapVersion2,
        musicMapId: mapId,
        nodeId: mapNode2,
        versionNumber: 2,
        lifecycle: VersionLifecycle.LOCKED,
        sourceAnalysisVersionId: analysisVersionId,
        revision: 1,
        tempoBpm: 118,
        meterNumerator: 4,
        meterDenominator: 4,
        beatOffsetMs: 0,
        barPhase: 0,
        beatGridSource: "manual-tempo",
        beatGridMs: [0, 508, 1017, 1525],
        barGridMs: [0],
        durationMs: 60000,
        createdByUserId: userId,
        lockedAt: new Date()
      }
    });

    const state = await getCreativeBriefState({ userId, projectId });
    assert.equal(state.needsRebase, true);
    assert.equal(state.latestMusicMap?.versionNumber, 2);
    assert.equal(state.latest?.sourceMusicMapVersionNumber, 1);

    console.log("Creative Brief smoke test passed.");
  } finally {
    const briefVersions = await db.creativeBriefVersion.findMany({
      where: {
        creativeBrief: { projectId }
      },
      select: { id: true, nodeId: true }
    });
    const mapVersions = await db.musicMapVersion.findMany({
      where: {
        musicMap: { projectId }
      },
      select: { id: true, nodeId: true }
    });

    await db.dependencyEdge.deleteMany({
      where: {
        OR: [
          {
            downstreamNodeId: {
              in: briefVersions.map((item) => item.nodeId)
            }
          },
          {
            upstreamNodeId: {
              in: mapVersions.map((item) => item.nodeId)
            }
          }
        ]
      }
    });
    await db.creativeBriefVersion.deleteMany({
      where: { id: { in: briefVersions.map((item) => item.id) } }
    });
    await db.creativeBrief.deleteMany({ where: { projectId } });
    await db.musicMapAnchor.deleteMany({
      where: {
        musicMapVersionId: {
          in: mapVersions.map((item) => item.id)
        }
      }
    });
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
            ...mapVersions.map((item) => item.nodeId),
            ...briefVersions.map((item) => item.nodeId)
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
