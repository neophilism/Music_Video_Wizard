"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const kinds = [
  "VISUAL_AESTHETIC",
  "COLOR_LIGHTING",
  "CHARACTER",
  "WARDROBE",
  "LOCATION_WORLD",
  "PROP",
  "CINEMATOGRAPHY_GRAMMAR",
  "COMPOSITION_GRAMMAR",
  "MOTION_GRAMMAR",
  "PERFORMANCE_GRAMMAR",
  "EDITING_GRAMMAR",
  "TRANSITION_GRAMMAR",
  "PACING_CURVE",
  "NARRATIVE_TEMPLATE",
  "MOTIF",
  "IMAGE_PROMPT_MODULE",
  "NEGATIVE_PROMPT_MODULE",
  "VIDEO_PROMPT_MODULE",
  "GENERATION_RECIPE",
  "TYPOGRAPHY_KIT",
  "OUTPUT_PRESET",
  "STORYBOARD_PATTERN",
  "OTHER"
] as const;

interface CreativeModuleFormProps {
  mode: "create" | "version";
  endpoint: string;
  moduleId?: string;
  defaults?: {
    definition?: string;
    positivePrompt?: string;
    negativePrompt?: string;
    notes?: string;
  };
}

export function CreativeModuleForm({
  mode,
  endpoint,
  moduleId,
  defaults
}: CreativeModuleFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(event.currentTarget)
      });
      const payload = (await response.json()) as {
        moduleId?: string;
        error?: string;
      };

      if (!response.ok || !payload.moduleId) {
        setError(payload.error ?? "Creative Library save failed.");
        return;
      }

      router.push(`/app/library/${payload.moduleId}`);
      router.refresh();
    } catch {
      setError("Creative Library save failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="projectForm" onSubmit={submit}>
      {mode === "create" ? (
        <>
          <label>
            <span>Type</span>
            <select name="kind" defaultValue="VISUAL_AESTHETIC">
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Name</span>
            <input name="name" required maxLength={160} autoFocus />
          </label>

          <label>
            <span>Description</span>
            <textarea name="description" rows={3} maxLength={5000} />
          </label>

          <label>
            <span>Tags</span>
            <input
              name="tags"
              placeholder="noir, dreamlike, handheld"
              maxLength={1000}
            />
            <small>Comma-separated. Tags are normalized for search.</small>
          </label>
        </>
      ) : null}

      <label>
        <span>Structured definition</span>
        <textarea
          name="definition"
          rows={10}
          required
          defaultValue={defaults?.definition ?? "{}"}
          spellCheck={false}
        />
        <small>
          JSON object containing the reusable creative decision. Keep provider
          settings here only when this item is intentionally a generation recipe.
        </small>
      </label>

      <label>
        <span>Positive prompt module</span>
        <textarea
          name="positivePrompt"
          rows={5}
          defaultValue={defaults?.positivePrompt ?? ""}
          maxLength={20000}
        />
      </label>

      <label>
        <span>Negative prompt / exclusions</span>
        <textarea
          name="negativePrompt"
          rows={5}
          defaultValue={defaults?.negativePrompt ?? ""}
          maxLength={20000}
        />
      </label>

      <label>
        <span>Reference asset version IDs</span>
        <textarea
          name="referenceAssetVersionIds"
          rows={3}
          placeholder="Optional exact asset-version UUIDs, separated by spaces or lines"
        />
        <small>
          References are pinned to exact READY asset versions in this workspace.
        </small>
      </label>

      <label>
        <span>Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaults?.notes ?? ""}
          maxLength={20000}
        />
      </label>

      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}

      <div className="formActions">
        <button className="primaryButton" disabled={pending} type="submit">
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create library item"
              : "Create new version"}
        </button>
        {moduleId ? (
          <button
            className="secondaryButton"
            type="button"
            onClick={() => router.push(`/app/library/${moduleId}`)}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
