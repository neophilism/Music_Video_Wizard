"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface CreativeKitLibraryOption {
  id: string;
  moduleName: string;
  kind: string;
  versionNumber: number;
}

interface CreativeKitRow {
  slot: string;
  creativeModuleVersionId: string;
}

interface CreativeKitFormProps {
  mode: "create" | "version";
  endpoint: string;
  kitId?: string;
  availableVersions: CreativeKitLibraryOption[];
  initialItems?: CreativeKitRow[];
  initialNotes?: string;
}

export function CreativeKitForm({
  mode,
  endpoint,
  kitId,
  availableVersions,
  initialItems,
  initialNotes
}: CreativeKitFormProps) {
  const router = useRouter();
  const defaultVersionId = availableVersions[0]?.id ?? "";
  const [items, setItems] = useState<CreativeKitRow[]>(
    initialItems?.length
      ? initialItems
      : [{ slot: "visual-aesthetic", creativeModuleVersionId: defaultVersionId }]
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  function updateItem(index: number, patch: Partial<CreativeKitRow>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { slot: "", creativeModuleVersionId: defaultVersionId }
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

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
        kitId?: string;
        error?: string;
      };

      if (!response.ok || !payload.kitId) {
        setError(payload.error ?? "Creative Kit save failed.");
        return;
      }

      router.push(`/app/kits/${payload.kitId}`);
      router.refresh();
    } catch {
      setError("Creative Kit save failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="projectForm" onSubmit={submit}>
      {mode === "create" ? (
        <>
          <label>
            <span>Kit name</span>
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
              maxLength={1000}
              placeholder="noir, performance, chase"
            />
            <small>Comma-separated. Tags are normalized for search.</small>
          </label>
        </>
      ) : null}

      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="kitItems">
        <div className="sectionHeading">
          <div>
            <h2>Exact Library versions</h2>
            <p className="dashboardNote">
              Each slot points to one published Library version. The slot
              determines how the kit participates in project → sequence → shot
              inheritance when it is applied.
            </p>
          </div>
          <button
            className="secondaryButton"
            type="button"
            onClick={addItem}
            disabled={!defaultVersionId || items.length >= 64}
          >
            Add slot
          </button>
        </div>

        {availableVersions.length === 0 ? (
          <p className="formError">
            Publish at least one Creative Library version before creating a kit.
          </p>
        ) : null}

        {items.map((item, index) => (
          <div className="kitItemRow" key={index}>
            <label>
              <span>Slot</span>
              <input
                required
                value={item.slot}
                onChange={(event) =>
                  updateItem(index, { slot: event.target.value })
                }
                placeholder="visual-aesthetic"
                pattern="[a-z0-9][a-z0-9:_-]{0,127}"
              />
            </label>

            <label>
              <span>Published Library version</span>
              <select
                required
                value={item.creativeModuleVersionId}
                onChange={(event) =>
                  updateItem(index, {
                    creativeModuleVersionId: event.target.value
                  })
                }
              >
                <option value="" disabled>
                  Select a Library version
                </option>
                {availableVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.moduleName} · v{version.versionNumber} ·{" "}
                    {version.kind.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="secondaryButton kitRemoveButton"
              type="button"
              onClick={() => removeItem(index)}
              disabled={items.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <label>
        <span>Version notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={initialNotes ?? ""}
          maxLength={20000}
        />
      </label>

      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}

      <div className="formActions">
        <button
          className="primaryButton"
          disabled={pending || availableVersions.length === 0}
          type="submit"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create Creative Kit"
              : "Create new kit version"}
        </button>
        {kitId ? (
          <button
            className="secondaryButton"
            type="button"
            onClick={() => router.push(`/app/kits/${kitId}`)}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
