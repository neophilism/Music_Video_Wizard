import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AssetKind,
  AssetStatus,
  ConceptLineageRole,
  ConceptOptionOrigin,
  DomainVersionKind,
  GenerationKind,
  GenerationStatus,
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
  completeConcepts,
  getConceptState,
  initializeConceptSet,
  lockConcepts,
  persistConceptGeneration,
  reopenConcepts,
  selectConcept
} from "../src/lib/concepts/service";
import {
  queuedConceptGenerationSchema
} from "../src/lib/concepts/input";
import type { ConceptContent } from "../src/lib/concepts/schema";
import {
  ensureWizardProgress,
  WizardLockedError
} from "../src/lib/wizard/service";

function concept(
  title: string,
  distinguishing: string
): ConceptContent {
  return {
    title,
    logline:
      "A controlled visual world breaks open in sync with the song's emotional release.",
    centralPremise:
      "Containment becomes liberation through a recurring spatial transformation.",
    synopsis:
      "The video begins in a restrictive environment, expands at each approved musical anchor, and resolves in an open public space.",
    visualWorld:
      "Textured practical spaces extended by restrained surreal transformations.",
    narrativeApproach:
      "A simple spatial journey provides the dramatic spine.",
    performanceApproach:
      "Performance punctuates major musical releases instead of dominating every section.",
    abstractApproach:
      "Architecture changes metaphorically as the emotional pressure releases.",
    artistRole:
      "The artist is both performer and participant in the transformation.",
    relationshipToSong:
      "Verses are treated in counterpoint while major structural releases synchronize strongly.",
    emotionalArc:
      "Pressure, destabilization, wonder, and earned release.",
    musicalArc:
      "Visual scale expands at each accepted Music Map anchor.",
    distinctiveImages: [
      "a sealed room",
      "a doorway opening onto impossible daylight",
      "a widening street procession"
    ],
    recurringMotifs: ["threshold", "red thread"],
    endingImage:
      "The artist crosses the final threshold into a broad open space.",
    productionLogic:
      "A limited number of controllable locations expand through compositing and generated extensions.",
    strengths: [
      "clear emotional spine",
      "strong recurring visual system"
    ],
    risks: ["the central motif could become repetitive"],
    contrastStatement: distinguishing,
    briefAlignment: {
      objective: {
        rating: "STRONG",
        rationale: "Directly supports escalation and release."
      },
      emotion: {
        rating: "STRONG",
        rationale: "Tracks tension into liberation."
      },
      form: {
        rating: "STRONG",
        rationale:
          "Preserves the requested narrative, performance, and abstract balance."
      },
      imagery: {
        rating: "STRONG",
        rationale:
          "Uses required threshold imagery and avoids excluded imagery."
      },
      constraints: {
        rating: "STRONG",
        rationale: "Requires no on-screen text."
      }
    }
  };
}

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
  const briefId = randomUUID();
  const briefVersionId = randomUUID();
  const briefNodeId = randomUUID();

  try {
    await db.user.create({
      data: {
        id: userId,
        email: "concepts-" + userId + "@example.test",
        displayName: "Concept Smoke"
      }
    });
    await db.workspace.create({
      data: {
        id: workspaceId,
        name: "Concept Smoke Workspace",
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
        title: "Concept Smoke Project"
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
        { id: mapNodeId, kind: DomainVersionKind.MUSIC_MAP },
        {
          id: briefNodeId,
          kind: DomainVersionKind.CREATIVE_BRIEF
        }
      ]
    });

    await db.asset.create({
      data: {
        id: assetId,
        workspaceId,
        projectId,
        kind: AssetKind.AUDIO_MASTER,
        name: "concept-smoke.wav"
      }
    });
    await db.assetVersion.create({
      data: {
        id: audioVersionId,
        assetId,
        nodeId: audioNodeId,
        versionNumber: 1,
        status: AssetStatus.READY,
        storageKey: "concept-smoke/" + audioVersionId + ".wav",
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
        title: "Concept Smoke Project",
        aspectRatio: "16:9",
        outputWidth: 1920,
        outputHeight: 1080,
        frameRate: 24,
        audioMasterAssetVersionId: audioVersionId
      }
    });

    await db.musicAnalysis.create({
      data: { id: analysisId, projectId }
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
            version: "1",
            sampleRate: 22050,
            hopLength: 512
          },
          durationMs: 60000,
          waveform: [],
          tempo: {
            bpm: 120,
            confidence: 1,
            beatCount: 120
          },
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
      data: { id: mapId, projectId }
    });
    await db.musicMapVersion.create({
      data: {
        id: mapVersionId,
        musicMapId: mapId,
        nodeId: mapNodeId,
        versionNumber: 1,
        lifecycle: VersionLifecycle.LOCKED,
        sourceAnalysisVersionId: analysisVersionId,
        revision: 2,
        tempoBpm: 120,
        meterNumerator: 4,
        meterDenominator: 4,
        beatOffsetMs: 0,
        barPhase: 0,
        beatGridSource: "analysis",
        beatGridMs: [0, 500, 1000],
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

    const brief = {
      objective:
        "Create an emotionally escalating video that earns liberation.",
      audience:
        "Adults who reward cinematic storytelling and close visual attention.",
      desiredFeelings: ["tension", "wonder", "release"],
      tone: ["serious", "kinetic", "humane"],
      contentMix: {
        narrative: 50,
        performance: 30,
        abstract: 20
      },
      literalMetaphoricalMode: "MOSTLY_METAPHORICAL",
      literalMetaphoricalNotes:
        "Concrete events should carry symbolic meaning.",
      artistPresence: "PERFORMANCE",
      artistPresenceNotes:
        "Performance punctuates the story.",
      visualDialogueMode: "COUNTERPOINT",
      visualDialogueNotes:
        "Do not simply illustrate lyrics.",
      requiredImagery: ["an open doorway"],
      avoidedImagery: ["generic nightclub imagery"],
      evolution:
        "Begin contained, fracture at the midpoint, then open out.",
      endingResolution:
        "Resolve with an earned image of freedom.",
      recurringSymbols: ["doorway", "red thread"],
      culturalPeriodInfluences: [
        "late-1970s urban photography"
      ],
      references: ["35mm street photography"],
      constraints: ["No on-screen text"],
      notes: ""
    };

    await db.creativeBrief.create({
      data: { id: briefId, projectId }
    });
    await db.creativeBriefVersion.create({
      data: {
        id: briefVersionId,
        creativeBriefId: briefId,
        nodeId: briefNodeId,
        versionNumber: 1,
        lifecycle: VersionLifecycle.LOCKED,
        sourceMusicMapVersionId: mapVersionId,
        revision: 3,
        brief,
        createdByUserId: userId,
        lockedAt: new Date()
      }
    });

    await ensureWizardProgress({ userId, projectId });

    let set = await initializeConceptSet({
      userId,
      projectId
    });
    assert.equal(set.versionNumber, 1);
    assert.equal(
      set.sourceCreativeBriefVersionId,
      briefVersionId
    );
    assert.equal(set.options.length, 0);

    const edge = await db.dependencyEdge.findFirst({
      where: {
        upstreamNodeId: briefNodeId,
        downstreamNodeId: set.nodeId,
        relation: "REFERENCES"
      }
    });
    assert.ok(edge);

    const job1 = randomUUID();
    const request1 = queuedConceptGenerationSchema.parse({
      textOperation: "concepts",
      projectId,
      projectVersionId,
      conceptSetVersionId: set.id,
      creativeBriefVersionId: briefVersionId,
      operation: "generate",
      count: 2,
      direction: "",
      parentConceptIds: []
    });
    await db.generationJob.create({
      data: {
        id: job1,
        workspaceId,
        projectId,
        kind: GenerationKind.TEXT,
        status: GenerationStatus.RUNNING,
        providerKey: "test",
        modelKey: "test-model",
        requestSnapshot: JSON.parse(JSON.stringify(request1)),
        requestedByUserId: userId,
        inputs: {
          create: [
            {
              nodeId: set.nodeId,
              role: "concept-set",
              position: 0
            },
            {
              nodeId: briefNodeId,
              role: "creative-brief",
              position: 0
            }
          ]
        }
      }
    });

    const generated = await persistConceptGeneration({
      generationJobId: job1,
      request: request1,
      concepts: [
        concept("Threshold", "Spatial transformation drives the concept."),
        concept("Procession", "Collective movement drives the concept.")
      ],
      requestedByUserId: userId
    });
    assert.equal(generated.conceptIds.length, 2);
    await db.generationJob.update({
      where: { id: job1 },
      data: {
        status: GenerationStatus.SUCCEEDED,
        completedAt: new Date()
      }
    });

    let state = await getConceptState({ userId, projectId });
    assert.equal(state.latest?.options.length, 2);
    set = state.latest!;
    assert.ok(
      set.options.every(
        (option) => option.origin === ConceptOptionOrigin.GENERATED
      )
    );

    const output = await db.generationOutput.findFirst({
      where: {
        jobId: job1,
        nodeId: set.nodeId,
        role: "concept-set"
      }
    });
    assert.ok(output);

    const progress = await db.wizardProgress.findUniqueOrThrow({
      where: { projectVersionId },
      include: { steps: true }
    });
    const treatment = progress.steps.find(
      (step) => step.stepKey === "treatment"
    );
    assert.ok(treatment);
    await db.wizardStepState.update({
      where: { id: treatment!.id },
      data: {
        status: WizardStepStatus.COMPLETED,
        payload: { touched: true },
        completedAt: new Date()
      }
    });

    const firstId = set.options[0]!.id;
    let selected = await selectConcept({
      userId,
      projectId,
      conceptSetVersionId: set.id,
      expectedRevision: set.revision,
      conceptId: firstId
    });
    set = selected.version;
    assert.equal(set.selectedConceptId, firstId);

    const invalidatedTreatment =
      await db.wizardStepState.findUniqueOrThrow({
        where: { id: treatment!.id }
      });
    assert.equal(
      invalidatedTreatment.status,
      WizardStepStatus.NEEDS_REVIEW
    );
    assert.match(
      invalidatedTreatment.reviewReason ?? "",
      /Concepts/i
    );

    let completed = await completeConcepts({
      userId,
      projectId,
      conceptSetVersionId: set.id,
      expectedRevision: set.revision
    });
    set = completed.version;
    let currentProgress =
      await db.wizardProgress.findUniqueOrThrow({
        where: { projectVersionId },
        include: { steps: true }
      });
    assert.equal(
      currentProgress.steps.find(
        (step) => step.stepKey === "concepts"
      )?.status,
      WizardStepStatus.COMPLETED
    );

    set = (
      await reopenConcepts({
        userId,
        projectId,
        conceptSetVersionId: set.id,
        expectedRevision: set.revision
      })
    ).version;

    const job2 = randomUUID();
    const request2 = queuedConceptGenerationSchema.parse({
      textOperation: "concepts",
      projectId,
      projectVersionId,
      conceptSetVersionId: set.id,
      creativeBriefVersionId: briefVersionId,
      operation: "revise",
      count: 1,
      direction: "Make the liberation less literal and more uncanny.",
      parentConceptIds: [firstId]
    });
    await db.generationJob.create({
      data: {
        id: job2,
        workspaceId,
        projectId,
        kind: GenerationKind.TEXT,
        status: GenerationStatus.RUNNING,
        providerKey: "test",
        modelKey: "test-model",
        requestSnapshot: JSON.parse(JSON.stringify(request2)),
        requestedByUserId: userId,
        inputs: {
          create: [
            {
              nodeId: set.nodeId,
              role: "concept-set",
              position: 0
            },
            {
              nodeId: briefNodeId,
              role: "creative-brief",
              position: 0
            }
          ]
        }
      }
    });

    const revised = await persistConceptGeneration({
      generationJobId: job2,
      request: request2,
      concepts: [
        concept(
          "Threshold / Uncanny",
          "The same emotional spine becomes less literal and more spatially impossible."
        )
      ],
      requestedByUserId: userId
    });
    assert.equal(revised.conceptIds.length, 1);
    await db.generationJob.update({
      where: { id: job2 },
      data: {
        status: GenerationStatus.SUCCEEDED,
        completedAt: new Date()
      }
    });

    state = await getConceptState({ userId, projectId });
    set = state.latest!;
    const revisedOption = set.options.find(
      (option) => option.id === revised.conceptIds[0]
    );
    assert.ok(revisedOption);
    assert.equal(revisedOption!.origin, ConceptOptionOrigin.REVISED);
    assert.equal(revisedOption!.parents.length, 1);
    assert.equal(
      revisedOption!.parents[0]!.role,
      ConceptLineageRole.REVISION_SOURCE
    );
    assert.equal(
      revisedOption!.parents[0]!.parentConceptId,
      firstId
    );

    await db.wizardStepState.update({
      where: { id: treatment!.id },
      data: {
        status: WizardStepStatus.COMPLETED,
        reviewReason: null,
        needsReviewAt: null,
        completedAt: new Date()
      }
    });

    selected = await selectConcept({
      userId,
      projectId,
      conceptSetVersionId: set.id,
      expectedRevision: set.revision,
      conceptId: revisedOption!.id
    });
    set = selected.version;
    assert.equal(set.selectedConceptId, revisedOption!.id);

    assert.equal(
      (
        await db.wizardStepState.findUniqueOrThrow({
          where: { id: treatment!.id }
        })
      ).status,
      WizardStepStatus.NEEDS_REVIEW
    );

    set = (
      await completeConcepts({
        userId,
        projectId,
        conceptSetVersionId: set.id,
        expectedRevision: set.revision
      })
    ).version;

    set = (
      await lockConcepts({
        userId,
        projectId,
        conceptSetVersionId: set.id,
        expectedRevision: set.revision
      })
    ).version;
    assert.equal(set.lifecycle, VersionLifecycle.LOCKED);

    const genericLock = await lockVersionNode(set.nodeId);
    assert.equal(genericLock.alreadyLocked, true);

    await assert.rejects(
      () =>
        selectConcept({
          userId,
          projectId,
          conceptSetVersionId: set.id,
          expectedRevision: set.revision,
          conceptId: firstId
        }),
      WizardLockedError
    );

    const fingerprint = await db.domainVersionNode.findUniqueOrThrow({
      where: { id: set.nodeId },
      select: { fingerprint: true }
    });
    assert.ok(fingerprint.fingerprint);

    const briefNode2 = randomUUID();
    const briefVersion2 = randomUUID();
    await db.domainVersionNode.create({
      data: {
        id: briefNode2,
        kind: DomainVersionKind.CREATIVE_BRIEF
      }
    });
    await db.creativeBriefVersion.create({
      data: {
        id: briefVersion2,
        creativeBriefId: briefId,
        nodeId: briefNode2,
        versionNumber: 2,
        lifecycle: VersionLifecycle.LOCKED,
        sourceMusicMapVersionId: mapVersionId,
        revision: 1,
        brief: {
          ...brief,
          endingResolution:
            "End with a deliberately unresolved threshold."
        },
        createdByUserId: userId,
        lockedAt: new Date()
      }
    });

    state = await getConceptState({ userId, projectId });
    assert.equal(state.needsRebase, true);
    assert.equal(state.latestBrief?.versionNumber, 2);
    assert.equal(
      state.latest?.sourceCreativeBriefVersionNumber,
      1
    );

    console.log("Concepts smoke test passed.");
  } finally {
    const conceptVersions = await db.conceptSetVersion.findMany({
      where: {
        conceptSet: { projectId }
      },
      select: { id: true, nodeId: true }
    });
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

    await db.conceptOptionLineage.deleteMany({
      where: {
        child: {
          conceptSetVersionId: {
            in: conceptVersions.map((item) => item.id)
          }
        }
      }
    });
    await db.conceptOption.deleteMany({
      where: {
        conceptSetVersionId: {
          in: conceptVersions.map((item) => item.id)
        }
      }
    });
    await db.generationOutput.deleteMany({
      where: {
        nodeId: {
          in: conceptVersions.map((item) => item.nodeId)
        }
      }
    });
    await db.generationInput.deleteMany({
      where: {
        nodeId: {
          in: [
            ...conceptVersions.map((item) => item.nodeId),
            ...briefVersions.map((item) => item.nodeId)
          ]
        }
      }
    });
    await db.generationJob.deleteMany({
      where: { projectId }
    });
    await db.dependencyEdge.deleteMany({
      where: {
        OR: [
          {
            downstreamNodeId: {
              in: conceptVersions.map((item) => item.nodeId)
            }
          },
          {
            upstreamNodeId: {
              in: briefVersions.map((item) => item.nodeId)
            }
          }
        ]
      }
    });
    await db.conceptSetVersion.deleteMany({
      where: {
        id: { in: conceptVersions.map((item) => item.id) }
      }
    });
    await db.conceptSet.deleteMany({ where: { projectId } });
    await db.creativeBriefVersion.deleteMany({
      where: {
        id: { in: briefVersions.map((item) => item.id) }
      }
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
            ...briefVersions.map((item) => item.nodeId),
            ...conceptVersions.map((item) => item.nodeId)
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
