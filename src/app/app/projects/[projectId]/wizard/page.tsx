import { AssetStatus } from "@prisma/client";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProjectSetupEditor } from "@/components/project-setup-editor";
import { MusicAnalysisEditor } from "@/components/music-analysis-editor";
import { MusicMapEditor } from "@/components/music-map-editor";
import { CreativeBriefEditor } from "@/components/creative-brief-editor";
import { ConceptsEditor } from "@/components/concepts-editor";
import { TreatmentEditor } from "@/components/treatment-editor";
import { WizardNavigation } from "@/components/wizard-navigation";
import { WizardStageShell } from "@/components/wizard-stage-placeholder";
import { db } from "@/lib/db";
import { createAssetStorage } from "@/lib/storage";
import { projectSetupDraftSchema } from "@/lib/wizard/input";
import { getMusicAnalysisState } from "@/lib/music-analysis/service";
import { getMusicMapState } from "@/lib/music-map/service";
import { getCreativeBriefState } from "@/lib/creative-brief/service";
import { getConceptState } from "@/lib/concepts/service";
import { getTreatmentState } from "@/lib/treatment/service";
import { getWizardView } from "@/lib/wizard/service";

export default async function ProjectWizardPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { projectId } = await props.params;
  const searchParams = await props.searchParams;
  const view = await getWizardView({
    userId: session.user.id,
    projectId,
    selectedStepKey: searchParams.step
  });

  const audio = view.projectVersion.audioMasterAssetVersionId
    ? await db.assetVersion.findFirst({
        where: {
          id: view.projectVersion.audioMasterAssetVersionId,
          asset: {
            workspace: {
              memberships: {
                some: { userId: session.user.id }
              }
            }
          }
        },
        include: { asset: true }
      })
    : null;

  const audioUrl =
    audio?.status === AssetStatus.READY
      ? await createAssetStorage().getSignedReadUrl(audio.storageKey, 60 * 30)
      : null;

  const selected = view.selected;
  const selectedPayload =
    selected.definition.editor === "project-setup"
      ? projectSetupDraftSchema.parse(selected.state.payload)
      : null;

  const musicAnalysisState =
    selected.definition.editor === "music-analysis"
      ? await getMusicAnalysisState({
          userId: session.user.id,
          projectId
        })
      : null;

  const musicMapState =
    selected.definition.editor === "music-map"
      ? await getMusicMapState({
          userId: session.user.id,
          projectId
        })
      : null;

  const creativeBriefState =
    selected.definition.editor === "creative-brief"
      ? await getCreativeBriefState({
          userId: session.user.id,
          projectId
        })
      : null;

  const conceptState =
    selected.definition.editor === "concepts"
      ? await getConceptState({
          userId: session.user.id,
          projectId
        })
      : null;

  const treatmentState =
    selected.definition.editor === "treatment"
      ? await getTreatmentState({
          userId: session.user.id,
          projectId
        })
      : null;

  return (
    <main className="wizardShell">
      <aside className="wizardSidebar">
        <div className="wizardSidebarHeader">
          <Link className="brandLink" href="/app">
            Music Video Wizard
          </Link>
          <p className="wizardProjectName">{view.project.title}</p>
          <p className="wizardProjectVersion">
            Project version {view.projectVersion.versionNumber} ·{" "}
            {view.projectVersion.lifecycle}
          </p>
        </div>

        <WizardNavigation
          projectId={projectId}
          steps={view.steps.map(({ definition, state }) => ({
            key: definition.key,
            ordinal: definition.ordinal,
            phase: definition.phase,
            title: definition.title,
            status: state.status,
            locked: Boolean(state.lockedAt),
            selected: definition.key === selected.definition.key
          }))}
        />
      </aside>

      <section className="wizardWorkspace">
        <div className="wizardWorkspaceTop">
          <div>
            <p className="eyebrow">{selected.definition.phase}</p>
            <h1 className="wizardTitle">{selected.definition.title}</h1>
            <p className="wizardDescription">
              {selected.definition.description}
            </p>
          </div>
          <div className="wizardStateBadges">
            <span>{selected.state.status.replaceAll("_", " ")}</span>
            {selected.state.lockedAt ? <span>Locked</span> : null}
          </div>
        </div>

        {selected.definition.editor === "project-setup" && selectedPayload ? (
          <>
            <section className="dashboardCard wizardAudioCard">
              <p className="dashboardLabel">Finished master audio</p>
              <p className="dashboardValue">
                {audio?.asset.name ?? "Audio unavailable"}
              </p>
              <p className="dashboardNote">
                The song is treated as the immutable master. This wizard plans
                and builds the video around it; it does not edit the music.
              </p>
              {audioUrl ? (
                <audio
                  className="audioPlayer"
                  controls
                  preload="metadata"
                  src={audioUrl}
                >
                  Your browser does not support audio playback.
                </audio>
              ) : null}
            </section>

            <section className="dashboardCard wizardEditorCard">
              <ProjectSetupEditor
                projectId={projectId}
                initialPayload={selectedPayload}
                initialRevision={view.progress.revision}
                initialStatus={selected.state.status}
                locked={Boolean(selected.state.lockedAt)}
                downstreamImpact={view.downstreamImpact}
              />
            </section>
          </>
        ) : selected.definition.editor === "music-analysis" &&
          musicAnalysisState ? (
          <>
            <section className="dashboardCard wizardAudioCard">
              <p className="dashboardLabel">Immutable master analyzed</p>
              <p className="dashboardValue">
                {audio?.asset.name ?? "Audio unavailable"}
              </p>
              {audioUrl ? (
                <audio
                  className="audioPlayer"
                  controls
                  preload="metadata"
                  src={audioUrl}
                >
                  Your browser does not support audio playback.
                </audio>
              ) : null}
            </section>

            <section className="dashboardCard wizardEditorCard">
              <MusicAnalysisEditor
                projectId={projectId}
                result={musicAnalysisState.latest?.result ?? null}
                analysisVersionNumber={
                  musicAnalysisState.latest?.versionNumber ?? null
                }
                recentJob={musicAnalysisState.recentJob}
                transcriptionAvailable={
                  musicAnalysisState.transcriptionAvailable
                }
                locked={Boolean(selected.state.lockedAt)}
                wizardStatus={selected.state.status}
                wizardRevision={view.progress.revision}
              />
            </section>
          </>
        ) : selected.definition.editor === "music-map" &&
          musicMapState ? (
          <section className="dashboardCard wizardEditorCard">
            <MusicMapEditor
              projectId={projectId}
              hasAnalysis={Boolean(musicMapState.latestAnalysis)}
              latestAnalysisVersionNumber={
                musicMapState.latestAnalysis?.versionNumber ?? null
              }
              needsRebase={musicMapState.needsRebase}
              initialMap={
                musicMapState.latest
                  ? {
                      ...musicMapState.latest,
                      lockedAt:
                        musicMapState.latest.lockedAt?.toISOString() ?? null,
                      createdAt:
                        musicMapState.latest.createdAt.toISOString()
                    }
                  : null
              }
              wizardStatus={selected.state.status}
              wizardLocked={Boolean(selected.state.lockedAt)}
            />
          </section>
        ) : selected.definition.editor === "creative-brief" &&
          creativeBriefState ? (
          <section className="dashboardCard wizardEditorCard">
            <CreativeBriefEditor
              projectId={projectId}
              sourceReady={creativeBriefState.sourceReady}
              latestMusicMap={
                creativeBriefState.latestMusicMap
                  ? {
                      ...creativeBriefState.latestMusicMap,
                      lifecycle:
                        creativeBriefState.latestMusicMap.lifecycle
                    }
                  : null
              }
              needsRebase={creativeBriefState.needsRebase}
              initialVersion={
                creativeBriefState.latest
                  ? {
                      id: creativeBriefState.latest.id,
                      nodeId: creativeBriefState.latest.nodeId,
                      versionNumber:
                        creativeBriefState.latest.versionNumber,
                      lifecycle: creativeBriefState.latest.lifecycle,
                      sourceMusicMapVersionId:
                        creativeBriefState.latest.sourceMusicMapVersionId,
                      sourceMusicMapVersionNumber:
                        creativeBriefState.latest
                          .sourceMusicMapVersionNumber,
                      revision: creativeBriefState.latest.revision,
                      brief: creativeBriefState.latest.brief,
                      sourceMusicMap:
                        creativeBriefState.latest.sourceMusicMap
                    }
                  : null
              }
              wizardStatus={selected.state.status}
              wizardLocked={Boolean(selected.state.lockedAt)}
              downstreamImpact={view.downstreamImpact}
            />
          </section>
        ) : selected.definition.editor === "concepts" &&
          conceptState ? (
          <section className="dashboardCard wizardEditorCard">
            <ConceptsEditor
              projectId={projectId}
              sourceReady={conceptState.sourceReady}
              latestBriefVersionNumber={
                conceptState.latestBrief?.versionNumber ?? null
              }
              needsRebase={conceptState.needsRebase}
              initialSet={
                conceptState.latest
                  ? {
                      ...conceptState.latest,
                      createdAt:
                        conceptState.latest.createdAt.toISOString(),
                      lockedAt:
                        conceptState.latest.lockedAt?.toISOString() ?? null,
                      options: conceptState.latest.options.map((option) => ({
                        ...option,
                        createdAt: option.createdAt.toISOString()
                      }))
                    }
                  : null
              }
              recentJob={conceptState.recentJob}
              providerAvailable={conceptState.providerAvailable}
              wizardStatus={selected.state.status}
              wizardLocked={Boolean(selected.state.lockedAt)}
              downstreamImpact={view.downstreamImpact}
            />
          </section>
        ) : selected.definition.editor === "treatment" &&
          treatmentState ? (
          <section className="dashboardCard wizardEditorCard">
            <TreatmentEditor
              projectId={projectId}
              sourceReady={treatmentState.sourceReady}
              needsRebase={treatmentState.needsRebase}
              initialVersion={
                treatmentState.latest
                  ? {
                      id: treatmentState.latest.id,
                      versionNumber: treatmentState.latest.versionNumber,
                      lifecycle: treatmentState.latest.lifecycle,
                      revision: treatmentState.latest.revision,
                      sourceConceptSetVersionNumber:
                        treatmentState.latest.sourceConceptSetVersionNumber,
                      sourceConceptId: treatmentState.latest.sourceConceptId,
                      selectedConcept: {
                        title: treatmentState.latest.selectedConcept.title,
                        logline: treatmentState.latest.selectedConcept.logline
                      },
                      musicMap: treatmentState.latest.musicMap,
                      treatment: treatmentState.latest.treatment,
                      generationJobId: treatmentState.latest.generationJobId
                    }
                  : null
              }
              recentJob={
                treatmentState.recentJob
                  ? {
                      id: treatmentState.recentJob.id,
                      status: treatmentState.recentJob.status,
                      progressPercent:
                        treatmentState.recentJob.progressPercent,
                      progressMessage:
                        treatmentState.recentJob.progressMessage,
                      errorMessage:
                        treatmentState.recentJob.errorMessage
                    }
                  : null
              }
              providerAvailable={treatmentState.providerAvailable}
              wizardStatus={selected.state.status}
              wizardLocked={Boolean(selected.state.lockedAt)}
              downstreamImpact={view.downstreamImpact}
            />
          </section>
        ) : (
          <section className="dashboardCard wizardEditorCard">
            <WizardStageShell
              title={selected.definition.title}
              description={selected.definition.description}
              status={selected.state.status}
              locked={Boolean(selected.state.lockedAt)}
              downstreamImpact={view.downstreamImpact}
            />
          </section>
        )}
      </section>
    </main>
  );
}
