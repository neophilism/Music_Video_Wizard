"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishCreativeKitButton(props: {
  kitId: string;
  versionId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/creative-kits/${props.kitId}/versions/${props.versionId}/publish`,
        { method: "POST" }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Publish failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Publish failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="publishControl">
      <button
        className="secondaryButton"
        type="button"
        disabled={pending}
        onClick={publish}
      >
        {pending ? "Publishing…" : "Publish immutable kit version"}
      </button>
      {error ? <span className="inlineError">{error}</span> : null}
    </div>
  );
}
