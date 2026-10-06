"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MusicAnalysisResult } from "@/lib/music-analysis/result";

type JobState = {
  id: string;
  status: string;
  progressPercent: number;
  progressMessage: string | null;
  errorMessage: string | null;
} | null;

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

export function MusicAnalysisEditor(props: {
  projectId: string;
  result: MusicAnalysisResult | null;
  analysisVersionNumber: number | null;
  recentJob: JobState;
  transcriptionAvailable: boolean;
  locked: boolean;
  wizardStatus: string;
  wizardRevision: number;
}) {
  const router = useRouter();
  const [job, setJob] = useState<JobState>(props.recentJob);
  const [includeLyrics, setIncludeLyrics] = useState(false);
  const [starting, setStarting] = useState(false);
  const [locked, setLocked] = useState(props.locked);
  const [message, setMessage] = useState<string | null>(null);

  const active = job?.status === "QUEUED" || job?.status === "RUNNING";

  useEffect(() => {
    if (!active || !job) return;

    const timer = window.setInterval(async () => {
      const response = await fetch("/api/jobs/" + job.id, {
        cache: "no-store"
      });
      if (!response.ok) return;
      const next = (await response.json()) as NonNullable<JobState>;
      setJob(next);

      if (next.status === "SUCCEEDED") {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [active, job, router]);

  const waveform = useMemo(() => {
    if (!props.result) return [];
    const step = Math.max(1, Math.ceil(props.result.waveform.length / 260));
    return props.result.waveform.filter((_, index) => index % step === 0);
  }, [props.result]);

  const energy = useMemo(() => {
    if (!props.result) return [];
    const step = Math.max(1, Math.ceil(props.result.energyCurve.length / 220));
    return props.result.energyCurve.filter((_, index) => index % step === 0);
  }, [props.result]);

  async function startAnalysis() {
    setStarting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${props.projectId}/music-analysis`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ includeLyrics })
        }
      );
      const payload = (await response.json()) as {
        jobId?: string;
        status?: string;
        error?: string;
      };
      if (!response.ok || !payload.jobId) {
        setMessage(payload.error ?? "Music analysis could not be queued.");
        return;
      }

      setJob({
        id: payload.jobId,
        status: payload.status ?? "QUEUED",
        progressPercent: 0,
        progressMessage: "Queued.",
        errorMessage: null
      });
    } catch {
      setMessage("Music analysis could not be queued.");
    } finally {
      setStarting(false);
    }
  }

  async function lockAnalysis() {
    setMessage(null);
    const response = await fetch(
      `/api/projects/${props.projectId}/wizard/steps/music-analysis/transition`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: props.wizardRevision,
          action: "lock"
        })
      }
    );
    const payload = (await response.json()) as {
      locked?: boolean;
      error?: string;
    };
    if (!response.ok) {
      setMessage(payload.error ?? "Music analysis could not be locked.");
      return;
    }
    setLocked(Boolean(payload.locked));
    setMessage("Music analysis locked for this project version.");
    router.refresh();
  }

  return (
    <div className="musicAnalysisEditor">
      <section className="analysisRunPanel">
        <div>
          <h2>{props.result ? "Analysis result" : "Analyze the finished song"}</h2>
          <p>
            The analyzer reads the immutable master and derives timing and
            structural information. It never edits or replaces the music.
          </p>
        </div>

        <div className="analysisRunControls">
          {props.transcriptionAvailable && !locked ? (
            <label className="analysisCheckbox">
              <input
                type="checkbox"
                checked={includeLyrics}
                onChange={(event) => setIncludeLyrics(event.target.checked)}
                disabled={active || starting}
              />
              Include optional lyric transcription
            </label>
          ) : null}

          <button
            className="primaryButton"
            type="button"
            disabled={locked || active || starting}
            onClick={() => void startAnalysis()}
          >
            {starting
              ? "Queuing…"
              : active
                ? "Analysis running…"
                : props.result
                  ? "Run new analysis version"
                  : "Analyze music"}
          </button>

          {props.result &&
          props.wizardStatus === "COMPLETED" &&
          !locked &&
          !active ? (
            <button
              className="secondaryButton"
              type="button"
              onClick={() => void lockAnalysis()}
            >
              Lock analysis
            </button>
          ) : null}
        </div>
      </section>

      {active && job ? (
        <section className="analysisProgress" aria-live="polite">
          <div className="analysisProgressHeader">
            <strong>{job.progressMessage || "Analyzing…"}</strong>
            <span>{job.progressPercent}%</span>
          </div>
          <div className="analysisProgressTrack">
            <div style={{ width: job.progressPercent + "%" }} />
          </div>
        </section>
      ) : null}

      {job?.status === "FAILED" ? (
        <p className="formError">
          Analysis failed: {job.errorMessage || "Unknown error"}
        </p>
      ) : null}

      {message ? <p className="wizardMessage">{message}</p> : null}

      {locked ? (
        <p className="wizardLockedLabel">
          Analysis locked in this project version
        </p>
      ) : null}

      {props.result ? (
        <>
          <section className="analysisStats">
            <div>
              <span>Duration</span>
              <strong>{formatTime(props.result.durationMs)}</strong>
            </div>
            <div>
              <span>Tempo</span>
              <strong>{props.result.tempo.bpm.toFixed(1)} BPM</strong>
            </div>
            <div>
              <span>Beats</span>
              <strong>{props.result.tempo.beatCount}</strong>
            </div>
            <div>
              <span>Sections</span>
              <strong>{props.result.sections.length}</strong>
            </div>
            <div>
              <span>Drop candidates</span>
              <strong>{props.result.drops.length}</strong>
            </div>
            <div>
              <span>Transition anchors</span>
              <strong>{props.result.transitionCandidates.length}</strong>
            </div>
          </section>

          <section className="analysisVisualization">
            <div className="analysisSectionHeading">
              <div>
                <p className="eyebrow">Waveform</p>
                <h3>Amplitude overview</h3>
              </div>
              {props.analysisVersionNumber ? (
                <span>Analysis v{props.analysisVersionNumber}</span>
              ) : null}
            </div>
            <div className="waveformOverview" aria-label="Waveform overview">
              {waveform.map((point, index) => {
                const magnitude = Math.max(
                  Math.abs(point.min),
                  Math.abs(point.max)
                );
                return (
                  <i
                    key={index}
                    style={{
                      height: Math.max(3, Math.round(magnitude * 100)) + "%"
                    }}
                  />
                );
              })}
            </div>
          </section>

          <section className="analysisVisualization">
            <div className="analysisSectionHeading">
              <div>
                <p className="eyebrow">Energy</p>
                <h3>Normalized energy curve</h3>
              </div>
            </div>
            <div className="energyOverview" aria-label="Energy curve">
              {energy.map((point, index) => (
                <i
                  key={index}
                  style={{
                    height: Math.max(2, Math.round(point.value * 100)) + "%"
                  }}
                />
              ))}
            </div>
          </section>

          <section className="analysisColumns">
            <div className="analysisVisualization">
              <div className="analysisSectionHeading">
                <div>
                  <p className="eyebrow">Estimated structure</p>
                  <h3>Section boundaries</h3>
                </div>
              </div>
              <div className="analysisList">
                {props.result.sections.map((section) => (
                  <div key={section.index}>
                    <strong>{section.label}</strong>
                    <span>
                      {formatTime(section.startMs)}–{formatTime(section.endMs)}
                    </span>
                    <small>
                      energy {Math.round(section.meanEnergy * 100)}%
                    </small>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysisVisualization">
              <div className="analysisSectionHeading">
                <div>
                  <p className="eyebrow">Editorial anchors</p>
                  <h3>Strong transition candidates</h3>
                </div>
              </div>
              <div className="analysisList">
                {props.result.transitionCandidates
                  .slice()
                  .sort((left, right) => right.score - left.score)
                  .slice(0, 12)
                  .map((candidate) => (
                    <div key={candidate.timeMs}>
                      <strong>{formatTime(candidate.timeMs)}</strong>
                      <span>{candidate.reasons.join(", ")}</span>
                      <small>
                        score {Math.round(candidate.score * 100)}%
                      </small>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="analysisCaveat">
            <strong>Machine analysis, not a creative decision.</strong>
            <p>
              Beat, bar, section, drop, intro/outro, and transition locations
              are algorithmic estimates. PR 12’s Music Map is where the user
              will correct, rename, accept, reject, and add musical anchors.
            </p>
          </section>

          {props.result.transcript?.text ? (
            <section className="analysisVisualization">
              <div className="analysisSectionHeading">
                <div>
                  <p className="eyebrow">Optional lyrics</p>
                  <h3>Transcription</h3>
                </div>
                <span>
                  {props.result.transcript.provider} ·{" "}
                  {props.result.transcript.model}
                </span>
              </div>
              <p className="analysisTranscript">
                {props.result.transcript.text}
              </p>
              {props.result.transcript.segments.length === 0 ? (
                <p className="dashboardNote">
                  This transcription response did not include timestamped
                  segments, so the analyzer did not invent vocal-passage or
                  instrumental-break timings.
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <section className="analysisEmpty">
          <h3>No analysis has been run yet.</h3>
          <p>
            Start the analysis to compute waveform, tempo, beat positions,
            4/4 bar candidates, energy, estimated sections, structural changes,
            drop candidates, intro/outro candidates, and editorial transition
            anchors.
          </p>
        </section>
      )}
    </div>
  );
}
