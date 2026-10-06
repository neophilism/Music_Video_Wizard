"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AnchorKind =
  | "SECTION"
  | "INTRO"
  | "OUTRO"
  | "BEAT"
  | "BAR"
  | "DROP"
  | "TRANSITION"
  | "VOCAL_PASSAGE"
  | "INSTRUMENTAL_BREAK"
  | "CUSTOM";

type AnchorDecision = "PENDING" | "ACCEPTED" | "REJECTED";

interface Anchor {
  id: string;
  sourceKey: string | null;
  kind: AnchorKind;
  source: "ANALYSIS" | "USER";
  decision: AnchorDecision;
  label: string;
  startMs: number;
  endMs: number | null;
  sourceStartMs: number | null;
  sourceEndMs: number | null;
  sourceConfidence: number | null;
  position: number;
  metadata: unknown;
}

interface MusicMapView {
  id: string;
  nodeId: string;
  versionNumber: number;
  lifecycle: "DRAFT" | "LOCKED" | "SUPERSEDED";
  sourceAnalysisVersionId: string;
  sourceAnalysisVersionNumber: number;
  revision: number;
  tempoBpm: number | null;
  meterNumerator: number;
  meterDenominator: number;
  beatOffsetMs: number;
  barPhase: number;
  beatGridSource: string;
  beatGridMs: number[];
  barGridMs: number[];
  durationMs: number;
  notes: string | null;
  lockedAt: string | Date | null;
  createdAt: string | Date;
  anchors: Anchor[];
  analysis: {
    waveform: Array<{
      startMs: number;
      endMs: number;
      min: number;
      max: number;
      rms: number;
    }>;
  };
}

function seconds(ms: number | null): string {
  if (ms === null) return "";
  return (ms / 1000)
    .toFixed(3)
    .replace(/\.000$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

function milliseconds(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Time must be a non-negative number of seconds.");
  }
  return Math.round(parsed * 1000);
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const secondsPart = total % 60;
  return minutes + ":" + String(secondsPart).padStart(2, "0");
}

function humanKind(kind: AnchorKind): string {
  return kind
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

async function responseJson(response: Response) {
  const payload = (await response.json()) as {
    error?: string;
    [key: string]: unknown;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload as unknown as MusicMapView;
}

function AnchorEditor(props: {
  anchor: Anchor;
  durationMs: number;
  disabled: boolean;
  onSave(anchor: Anchor, patch: Record<string, unknown>): Promise<void>;
  onDelete(anchor: Anchor): Promise<void>;
}) {
  const [label, setLabel] = useState(props.anchor.label);
  const [start, setStart] = useState(seconds(props.anchor.startMs));
  const [end, setEnd] = useState(seconds(props.anchor.endMs));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveTimingAndLabel() {
    setSaving(true);
    setError(null);
    try {
      const startMs = milliseconds(start);
      const endMs = end.trim() ? milliseconds(end) : null;
      if (startMs > props.durationMs || (endMs !== null && endMs > props.durationMs)) {
        throw new Error("Anchor must fall within the song.");
      }
      if (endMs !== null && endMs < startMs) {
        throw new Error("End time cannot precede start time.");
      }
      await props.onSave(props.anchor, {
        label: label.trim(),
        startMs,
        endMs
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function decide(decision: AnchorDecision) {
    setSaving(true);
    setError(null);
    try {
      await props.onSave(props.anchor, { decision });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={"mapAnchor mapAnchor-" + props.anchor.decision.toLowerCase()}>
      <div className="mapAnchorHeader">
        <div>
          <span className="mapAnchorKind">{humanKind(props.anchor.kind)}</span>
          <span className="mapAnchorSource">
            {props.anchor.source === "USER" ? "User" : "Analysis candidate"}
          </span>
        </div>
        {props.anchor.sourceConfidence !== null ? (
          <span className="mapAnchorConfidence">
            {Math.round(props.anchor.sourceConfidence * 100)}% confidence
          </span>
        ) : null}
      </div>

      <div className="mapAnchorFields">
        <label>
          <span>Label</span>
          <input
            value={label}
            maxLength={160}
            disabled={props.disabled || saving}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label>
          <span>Start (seconds)</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={start}
            disabled={props.disabled || saving}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          <span>End (seconds)</span>
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="Point anchor"
            value={end}
            disabled={props.disabled || saving}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>

      {props.anchor.source === "ANALYSIS" &&
      (props.anchor.sourceStartMs !== props.anchor.startMs ||
        props.anchor.sourceEndMs !== props.anchor.endMs) ? (
        <p className="mapOriginalTiming">
          Machine timing: {clock(props.anchor.sourceStartMs ?? props.anchor.startMs)}
          {props.anchor.sourceEndMs !== null
            ? "–" + clock(props.anchor.sourceEndMs)
            : ""}
        </p>
      ) : null}

      {error ? <p className="formError">{error}</p> : null}

      <div className="mapAnchorActions">
        <button
          className="secondaryButton"
          type="button"
          disabled={props.disabled || saving || !label.trim()}
          onClick={() => void saveTimingAndLabel()}
        >
          Save timing / label
        </button>

        {props.anchor.source === "ANALYSIS" ? (
          <>
            <button
              className={
                props.anchor.decision === "ACCEPTED"
                  ? "primaryButton"
                  : "secondaryButton"
              }
              type="button"
              disabled={props.disabled || saving}
              onClick={() => void decide("ACCEPTED")}
            >
              Accept
            </button>
            <button
              className={
                props.anchor.decision === "REJECTED"
                  ? "primaryButton"
                  : "secondaryButton"
              }
              type="button"
              disabled={props.disabled || saving}
              onClick={() => void decide("REJECTED")}
            >
              Reject
            </button>
            {props.anchor.decision !== "PENDING" ? (
              <button
                className="textButton"
                type="button"
                disabled={props.disabled || saving}
                onClick={() => void decide("PENDING")}
              >
                Return to pending
              </button>
            ) : null}
          </>
        ) : (
          <button
            className="textButton"
            type="button"
            disabled={props.disabled || saving}
            onClick={() => void props.onDelete(props.anchor)}
          >
            Delete custom anchor
          </button>
        )}
      </div>
    </article>
  );
}

export function MusicMapEditor(props: {
  projectId: string;
  hasAnalysis: boolean;
  latestAnalysisVersionNumber: number | null;
  needsRebase: boolean;
  initialMap: MusicMapView | null;
  wizardStatus: string;
  wizardLocked: boolean;
}) {
  const router = useRouter();
  const [map, setMap] = useState<MusicMapView | null>(props.initialMap);
  const [stageStatus, setStageStatus] = useState(props.wizardStatus);
  const [wizardLocked, setWizardLocked] = useState(props.wizardLocked);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | AnchorDecision>("ALL");

  const [gridBpm, setGridBpm] = useState(
    props.initialMap?.tempoBpm?.toString() ?? ""
  );
  const [gridNumerator, setGridNumerator] = useState(
    props.initialMap?.meterNumerator.toString() ?? "4"
  );
  const [gridDenominator, setGridDenominator] = useState(
    props.initialMap?.meterDenominator.toString() ?? "4"
  );
  const [gridOffset, setGridOffset] = useState(
    seconds(props.initialMap?.beatOffsetMs ?? 0)
  );
  const [gridPhase, setGridPhase] = useState(
    props.initialMap?.barPhase.toString() ?? "0"
  );

  const [customKind, setCustomKind] = useState<AnchorKind>("CUSTOM");
  const [customLabel, setCustomLabel] = useState("");
  const [customStart, setCustomStart] = useState("0");
  const [customEnd, setCustomEnd] = useState("");

  const pending = map?.anchors.filter((anchor) => anchor.decision === "PENDING").length ?? 0;
  const accepted = map?.anchors.filter((anchor) => anchor.decision === "ACCEPTED").length ?? 0;
  const rejected = map?.anchors.filter((anchor) => anchor.decision === "REJECTED").length ?? 0;

  const visibleAnchors = useMemo(() => {
    if (!map) return [];
    return map.anchors.filter(
      (anchor) => filter === "ALL" || anchor.decision === filter
    );
  }, [map, filter]);

  const waveform = useMemo(() => {
    if (!map) return [];
    const data = map.analysis.waveform;
    const step = Math.max(1, Math.ceil(data.length / 240));
    return data.filter((_, index) => index % step === 0);
  }, [map]);

  function apply(next: MusicMapView) {
    setMap(next);
    setGridBpm(next.tempoBpm?.toString() ?? "");
    setGridNumerator(next.meterNumerator.toString());
    setGridDenominator(next.meterDenominator.toString());
    setGridOffset(seconds(next.beatOffsetMs));
    setGridPhase(next.barPhase.toString());
    setStageStatus("IN_PROGRESS");
  }

  async function initialize() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${props.projectId}/music-map`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "initialize" })
        }
      );
      const next = await responseJson(response);
      apply(next);
      setMessage(
        "Music Map v" +
          next.versionNumber +
          " created from Music Analysis v" +
          next.sourceAnalysisVersionNumber +
          "."
      );
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Initialization failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnchor(anchor: Anchor, patch: Record<string, unknown>) {
    if (!map) return;
    const response = await fetch(
      `/api/projects/${props.projectId}/music-map/anchors/${anchor.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapVersionId: map.id,
          expectedRevision: map.revision,
          ...patch
        })
      }
    );
    const next = await responseJson(response);
    apply(next);
  }

  async function deleteAnchor(anchor: Anchor) {
    if (!map) return;
    const response = await fetch(
      `/api/projects/${props.projectId}/music-map/anchors/${anchor.id}`,
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapVersionId: map.id,
          expectedRevision: map.revision
        })
      }
    );
    const next = await responseJson(response);
    apply(next);
  }

  async function bulkDecision(decision: "ACCEPTED" | "REJECTED") {
    if (!map) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${props.projectId}/music-map/candidates`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mapVersionId: map.id,
            expectedRevision: map.revision,
            decision
          })
        }
      );
      apply(await responseJson(response));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Bulk update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGrid(mode: "manual-tempo" | "analysis") {
    if (!map) return;
    setBusy(true);
    setMessage(null);
    try {
      const body =
        mode === "analysis"
          ? {
              mapVersionId: map.id,
              expectedRevision: map.revision,
              mode
            }
          : {
              mapVersionId: map.id,
              expectedRevision: map.revision,
              mode,
              tempoBpm: Number(gridBpm),
              meterNumerator: Number(gridNumerator),
              meterDenominator: Number(gridDenominator),
              beatOffsetMs: milliseconds(gridOffset),
              barPhase: Number(gridPhase)
            };

      const response = await fetch(
        `/api/projects/${props.projectId}/music-map/grid`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      apply(await responseJson(response));
      setMessage(
        mode === "analysis"
          ? "Restored the exact analysis beat/bar grid."
          : "Saved the corrected beat/bar grid."
      );
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Grid update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addCustomAnchor() {
    if (!map) return;
    setBusy(true);
    setMessage(null);
    try {
      const startMs = milliseconds(customStart);
      const endMs = customEnd.trim() ? milliseconds(customEnd) : null;
      const response = await fetch(
        `/api/projects/${props.projectId}/music-map/anchors`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mapVersionId: map.id,
            expectedRevision: map.revision,
            kind: customKind,
            label: customLabel,
            startMs,
            endMs
          })
        }
      );
      apply(await responseJson(response));
      setCustomLabel("");
      setCustomEnd("");
      setMessage("Custom musical anchor added.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Anchor creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function stageAction(action: "complete" | "lock") {
    if (!map) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${props.projectId}/music-map`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            mapVersionId: map.id,
            expectedRevision: map.revision
          })
        }
      );
      const next = await responseJson(response);
      setMap(next);
      if (action === "complete") {
        setStageStatus("COMPLETED");
        setMessage("Music Map marked complete.");
      } else {
        setWizardLocked(true);
        setStageStatus("COMPLETED");
        setMessage("Music Map locked for this project version.");
      }
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Stage update failed.");
    } finally {
      setBusy(false);
    }
  }

  const disabled =
    busy || wizardLocked || map?.lifecycle === "LOCKED";

  if (!props.hasAnalysis) {
    return (
      <section className="mapEmpty">
        <h2>Music Analysis is required first.</h2>
        <p>
          The Music Map never invents a timing basis. Run the real Music
          Analysis stage, then return here to curate its estimates.
        </p>
        <button
          className="primaryButton"
          type="button"
          onClick={() =>
            router.push(
              `/app/projects/${props.projectId}/wizard?step=music-analysis` as Route
            )
          }
        >
          Go to Music Analysis
        </button>
      </section>
    );
  }

  if (!map) {
    return (
      <section className="mapEmpty">
        <p className="eyebrow">Human interpretation layer</p>
        <h2>Build the Music Map</h2>
        <p>
          Start from Music Analysis v{props.latestAnalysisVersionNumber}. The
          analysis remains immutable; this creates a separate editable map for
          your accepted sections, timing corrections, musical events, and
          custom visual/edit anchors.
        </p>
        <button
          className="primaryButton"
          type="button"
          disabled={busy || wizardLocked}
          onClick={() => void initialize()}
        >
          {busy ? "Building…" : "Build Music Map from analysis"}
        </button>
        {message ? <p className="wizardMessage">{message}</p> : null}
      </section>
    );
  }

  return (
    <div className="musicMapEditor">
      {props.needsRebase ? (
        <section className="impactWarning">
          <strong>New Music Analysis available</strong>
          <p>
            This map is based on Music Analysis v
            {map.sourceAnalysisVersionNumber}; the project now has analysis v
            {props.latestAnalysisVersionNumber}. Building a new map version
            preserves this one and carries forward your custom user anchors.
          </p>
          <button
            className="secondaryButton"
            type="button"
            disabled={disabled}
            onClick={() => void initialize()}
          >
            Build new map version from latest analysis
          </button>
        </section>
      ) : null}

      <section className="mapSummary">
        <div>
          <p className="eyebrow">Music Map v{map.versionNumber}</p>
          <h2>Curated musical timeline</h2>
          <p>
            Based on immutable Music Analysis v{map.sourceAnalysisVersionNumber}
            . Machine candidates remain visible even when rejected.
          </p>
        </div>
        <div className="mapSummaryStats">
          <span><strong>{accepted}</strong> accepted</span>
          <span><strong>{pending}</strong> pending</span>
          <span><strong>{rejected}</strong> rejected</span>
        </div>
      </section>

      <section className="mapTimeline">
        <div className="mapWaveform" aria-label="Music Map waveform">
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
          {map.anchors
            .filter((anchor) => anchor.decision === "ACCEPTED")
            .map((anchor) => (
              <b
                key={anchor.id}
                className={"mapTimelineMarker mapTimelineMarker-" + anchor.kind.toLowerCase()}
                title={anchor.label + " · " + clock(anchor.startMs)}
                style={{
                  left:
                    Math.min(
                      100,
                      (anchor.startMs / Math.max(1, map.durationMs)) * 100
                    ) + "%"
                }}
              />
            ))}
        </div>
        <div className="mapTimelineFooter">
          <span>0:00</span>
          <span>{clock(map.durationMs)}</span>
        </div>
      </section>

      <section className="mapGridPanel">
        <div className="analysisSectionHeading">
          <div>
            <p className="eyebrow">Timing grid</p>
            <h3>Beat and bar correction</h3>
          </div>
          <span>{map.beatGridSource}</span>
        </div>
        <p className="dashboardNote">
          Analysis currently supplies {map.beatGridMs.length} beat positions
          and {map.barGridMs.length} bar starts. Change the grid only when you
          want your correction—not the analyzer—to govern later timing.
        </p>
        <div className="mapGridFields">
          <label>
            <span>BPM</span>
            <input
              type="number"
              min="1"
              max="400"
              step="0.001"
              value={gridBpm}
              disabled={disabled}
              onChange={(event) => setGridBpm(event.target.value)}
            />
          </label>
          <label>
            <span>Meter numerator</span>
            <input
              type="number"
              min="1"
              max="32"
              value={gridNumerator}
              disabled={disabled}
              onChange={(event) => setGridNumerator(event.target.value)}
            />
          </label>
          <label>
            <span>Meter denominator</span>
            <select
              value={gridDenominator}
              disabled={disabled}
              onChange={(event) => setGridDenominator(event.target.value)}
            >
              {[1, 2, 4, 8, 16, 32].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Beat 1 offset (seconds)</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={gridOffset}
              disabled={disabled}
              onChange={(event) => setGridOffset(event.target.value)}
            />
          </label>
          <label>
            <span>Bar phase (0-based beat)</span>
            <input
              type="number"
              min="0"
              max={Math.max(0, Number(gridNumerator) - 1)}
              value={gridPhase}
              disabled={disabled}
              onChange={(event) => setGridPhase(event.target.value)}
            />
          </label>
        </div>
        <div className="mapPanelActions">
          <button
            className="primaryButton"
            type="button"
            disabled={disabled || !gridBpm}
            onClick={() => void saveGrid("manual-tempo")}
          >
            Use corrected grid
          </button>
          <button
            className="secondaryButton"
            type="button"
            disabled={disabled || map.beatGridSource === "analysis"}
            onClick={() => void saveGrid("analysis")}
          >
            Restore analysis grid
          </button>
        </div>
      </section>

      <section className="mapCandidateToolbar">
        <div>
          <p className="eyebrow">Machine candidates and user anchors</p>
          <h3>Review musical anchors</h3>
        </div>
        <div className="mapCandidateActions">
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "ALL" | AnchorDecision)
            }
          >
            <option value="ALL">All ({map.anchors.length})</option>
            <option value="PENDING">Pending ({pending})</option>
            <option value="ACCEPTED">Accepted ({accepted})</option>
            <option value="REJECTED">Rejected ({rejected})</option>
          </select>
          {pending > 0 ? (
            <>
              <button
                className="secondaryButton"
                type="button"
                disabled={disabled}
                onClick={() => void bulkDecision("ACCEPTED")}
              >
                Accept all pending
              </button>
              <button
                className="secondaryButton"
                type="button"
                disabled={disabled}
                onClick={() => void bulkDecision("REJECTED")}
              >
                Reject all pending
              </button>
            </>
          ) : null}
        </div>
      </section>

      <div className="mapAnchorList">
        {visibleAnchors.map((anchor) => (
          <AnchorEditor
            key={anchor.id + ":" + anchor.label + ":" + anchor.startMs + ":" + anchor.decision}
            anchor={anchor}
            durationMs={map.durationMs}
            disabled={disabled}
            onSave={saveAnchor}
            onDelete={deleteAnchor}
          />
        ))}
      </div>

      {!wizardLocked ? (
        <section className="mapCustomPanel">
          <div>
            <p className="eyebrow">Your own event</p>
            <h3>Add a custom musical / editorial anchor</h3>
          </div>
          <div className="mapCustomFields">
            <label>
              <span>Kind</span>
              <select
                value={customKind}
                disabled={disabled}
                onChange={(event) =>
                  setCustomKind(event.target.value as AnchorKind)
                }
              >
                {[
                  "SECTION",
                  "INTRO",
                  "OUTRO",
                  "BEAT",
                  "BAR",
                  "DROP",
                  "TRANSITION",
                  "VOCAL_PASSAGE",
                  "INSTRUMENTAL_BREAK",
                  "CUSTOM"
                ].map((kind) => (
                  <option key={kind} value={kind}>
                    {humanKind(kind as AnchorKind)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Label</span>
              <input
                value={customLabel}
                maxLength={160}
                disabled={disabled}
                onChange={(event) => setCustomLabel(event.target.value)}
              />
            </label>
            <label>
              <span>Start (seconds)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={customStart}
                disabled={disabled}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </label>
            <label>
              <span>End (optional seconds)</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={customEnd}
                disabled={disabled}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </label>
          </div>
          <button
            className="secondaryButton"
            type="button"
            disabled={disabled || !customLabel.trim()}
            onClick={() => void addCustomAnchor()}
          >
            Add custom anchor
          </button>
        </section>
      ) : null}

      {message ? <p className="wizardMessage">{message}</p> : null}

      <section className="mapCompletionPanel">
        <div>
          <strong>
            {stageStatus === "COMPLETED"
              ? "Music Map complete"
              : pending > 0
                ? pending + " candidate" + (pending === 1 ? "" : "s") + " still pending"
                : "Ready to complete"}
          </strong>
          <p>
            Completion requires every machine candidate to be explicitly
            accepted or rejected. Rejected candidates remain in the audit trail.
          </p>
        </div>
        <div className="mapPanelActions">
          {stageStatus !== "COMPLETED" ? (
            <button
              className="primaryButton"
              type="button"
              disabled={disabled || pending > 0 || accepted === 0}
              onClick={() => void stageAction("complete")}
            >
              Mark Music Map complete
            </button>
          ) : null}
          {stageStatus === "COMPLETED" && !wizardLocked ? (
            <button
              className="primaryButton"
              type="button"
              disabled={busy}
              onClick={() => void stageAction("lock")}
            >
              Lock Music Map
            </button>
          ) : null}
          {wizardLocked ? (
            <span className="wizardLockedLabel">
              Locked in this project version
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
