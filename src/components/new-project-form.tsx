"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/projects", {
        method: "POST",
        body: form
      });
      const payload = (await response.json()) as {
        projectId?: string;
        error?: string;
        issues?: string[];
      };

      if (!response.ok || !payload.projectId) {
        setError(
          payload.issues?.join(" ") ??
            payload.error ??
            "Project creation failed."
        );
        return;
      }

      router.push(`/app/projects/${payload.projectId}/wizard`);
    } catch {
      setError("Project creation failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="projectForm" onSubmit={submit}>
      <label>
        <span>Project title</span>
        <input name="title" required maxLength={160} autoFocus />
      </label>

      <label>
        <span>Description</span>
        <textarea
          name="description"
          maxLength={5000}
          rows={4}
          placeholder="Optional creative note"
        />
      </label>

      <div className="projectFormGrid">
        <label>
          <span>Aspect ratio</span>
          <select name="aspectRatio" defaultValue="16:9">
            <option value="16:9">16:9 — landscape</option>
            <option value="9:16">9:16 — vertical</option>
            <option value="1:1">1:1 — square</option>
            <option value="4:3">4:3</option>
            <option value="2.39:1">2.39:1 — cinematic</option>
          </select>
        </label>

        <label>
          <span>Frame rate</span>
          <select name="frameRate" defaultValue="24">
            <option value="23.976">23.976 fps</option>
            <option value="24">24 fps</option>
            <option value="25">25 fps</option>
            <option value="29.97">29.97 fps</option>
            <option value="30">30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </label>
      </div>

      <label>
        <span>Finished music</span>
        <input
          name="audio"
          type="file"
          accept=".mp3,.wav,.flac,.ogg,.opus,.aiff,.aif,.m4a,.aac,audio/*"
          required
        />
        <small>
          The uploaded song becomes the immutable master audio for this project.
          Music editing is intentionally outside this application.
        </small>
      </label>

      {error ? <p className="formError" role="alert">{error}</p> : null}

      <div className="formActions">
        <button className="primaryButton" type="submit" disabled={pending}>
          {pending ? "Creating project…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
