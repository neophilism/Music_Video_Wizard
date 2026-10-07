"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_VISUAL_AESTHETIC,
  parseVisualAestheticDefinition,
  type VisualAestheticDefinition,
  visualAestheticCompletionIssues,
  visualAestheticContrastValues,
  visualAestheticRealismValues,
  visualAestheticSaturationValues
} from "@/lib/visual-aesthetic/schema";

interface Props {
  mode: "create" | "version";
  endpoint: string;
  moduleId?: string;
  defaults?: {
    name?: string;
    description?: string;
    tags?: string[];
    definition?: unknown;
    positivePrompt?: string;
    negativePrompt?: string;
    notes?: string;
    referenceAssetVersionIds?: string[];
  };
}

function textList(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))];
}

function initialDefinition(value: unknown): VisualAestheticDefinition {
  const parsed = parseVisualAestheticDefinition.safeParse
    ? null
    : null;
  void parsed;
  try {
    return parseVisualAestheticDefinition(value ?? EMPTY_VISUAL_AESTHETIC);
  } catch {
    return EMPTY_VISUAL_AESTHETIC;
  }
}

export function VisualAestheticForm({ mode, endpoint, moduleId, defaults }: Props) {
  const router = useRouter();
  const [definition, setDefinition] = useState<VisualAestheticDefinition>(() =>
    initialDefinition(defaults?.definition)
  );
  const [references, setReferences] = useState(
    defaults?.referenceAssetVersionIds?.join("\n") ?? ""
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issues = useMemo(
    () => visualAestheticCompletionIssues(definition),
    [definition]
  );

  function patch<K extends keyof VisualAestheticDefinition>(
    key: K,
    value: VisualAestheticDefinition[K]
  ) {
    setDefinition((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      if (mode === "create") form.set("kind", "VISUAL_AESTHETIC");
      form.set("definition", JSON.stringify(definition));
      const refIds = textList(references);
      if (definition.previewAssetVersionId) refIds.push(definition.previewAssetVersionId);
      form.set("referenceAssetVersionIds", [...new Set(refIds)].join("\n"));

      const response = await fetch(endpoint, { method: "POST", body: form });
      const payload = (await response.json()) as { moduleId?: string; error?: string };
      if (!response.ok || !payload.moduleId) {
        setError(payload.error ?? "Visual aesthetic save failed.");
        return;
      }
      router.push(`/app/library/${payload.moduleId}`);
      router.refresh();
    } catch {
      setError("Visual aesthetic save failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="visualAestheticBuilder" onSubmit={submit}>
      {mode === "create" ? (
        <section className="aestheticPanel aestheticMeta">
          <label><span>Name</span><input name="name" required maxLength={160} defaultValue={defaults?.name ?? ""} autoFocus /></label>
          <label><span>Description</span><textarea name="description" rows={3} maxLength={5000} defaultValue={defaults?.description ?? ""} /></label>
          <label><span>Tags</span><input name="tags" defaultValue={defaults?.tags?.join(", ") ?? ""} placeholder="film, nocturnal, tactile" /></label>
        </section>
      ) : null}

      <section className="aestheticPreview">
        <div>
          <p className="eyebrow">Live style card</p>
          <h2>{definition.medium || "Untitled visual language"}</h2>
          <p>{definition.texture || "Texture will appear here as the aesthetic is defined."}</p>
          <div className="aestheticPalette">
            {definition.palette.length ? definition.palette.map((color) => (
              <span key={color.name + color.hex} title={color.name} style={{ backgroundColor: color.hex }} />
            )) : <em>Add palette colors below.</em>}
          </div>
        </div>
        <dl>
          <div><dt>Realism</dt><dd>{definition.realism}</dd></div>
          <div><dt>Saturation</dt><dd>{definition.saturation}</dd></div>
          <div><dt>Contrast</dt><dd>{definition.contrast}</dd></div>
          <div><dt>Lighting</dt><dd>{definition.lighting.quality || "—"}</dd></div>
          <div><dt>Rendering</dt><dd>{definition.renderingCharacteristics || "—"}</dd></div>
        </dl>
      </section>

      <section className="aestheticPanel">
        <h3>Image character</h3>
        <div className="aestheticGrid">
          <label><span>Medium</span><input value={definition.medium} onChange={(e)=>patch("medium",e.target.value)} placeholder="35mm film, charcoal animation, glossy digital..." /></label>
          <label><span>Realism</span><select value={definition.realism} onChange={(e)=>patch("realism",e.target.value as VisualAestheticDefinition["realism"])}>{visualAestheticRealismValues.map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="aestheticWide"><span>Movement character</span><textarea value={definition.movement} onChange={(e)=>patch("movement",e.target.value)} /></label>
          <label><span>Texture</span><textarea value={definition.texture} onChange={(e)=>patch("texture",e.target.value)} /></label>
          <label><span>Grain</span><textarea value={definition.grain} onChange={(e)=>patch("grain",e.target.value)} /></label>
          <label><span>Edge treatment</span><textarea value={definition.edgeTreatment} onChange={(e)=>patch("edgeTreatment",e.target.value)} /></label>
          <label><span>Rendering characteristics</span><textarea value={definition.renderingCharacteristics} onChange={(e)=>patch("renderingCharacteristics",e.target.value)} /></label>
          <label className="aestheticWide"><span>Period characteristics</span><textarea value={definition.periodCharacteristics} onChange={(e)=>patch("periodCharacteristics",e.target.value)} /></label>
        </div>
      </section>

      <section className="aestheticPanel">
        <h3>Color system</h3>
        <div className="aestheticGrid">
          <label className="aestheticWide"><span>Color treatment</span><textarea value={definition.colorTreatment} onChange={(e)=>patch("colorTreatment",e.target.value)} /></label>
          <label><span>Saturation</span><select value={definition.saturation} onChange={(e)=>patch("saturation",e.target.value as VisualAestheticDefinition["saturation"])}>{visualAestheticSaturationValues.map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Contrast</span><select value={definition.contrast} onChange={(e)=>patch("contrast",e.target.value as VisualAestheticDefinition["contrast"])}>{visualAestheticContrastValues.map(v=><option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="aestheticRepeater">
          <div className="aestheticRepeaterHeader"><strong>Named palette</strong><button className="secondaryButton" type="button" onClick={()=>patch("palette",[...definition.palette,{name:"new color",hex:"#808080"}])}>Add color</button></div>
          {definition.palette.map((color,index)=>(
            <div className="aestheticPaletteRow" key={index}>
              <input value={color.name} onChange={(e)=>patch("palette",definition.palette.map((item,i)=>i===index?{...item,name:e.target.value}:item))} />
              <input type="color" value={color.hex} onChange={(e)=>patch("palette",definition.palette.map((item,i)=>i===index?{...item,hex:e.target.value.toUpperCase()}:item))} />
              <code>{color.hex}</code>
              <button className="secondaryButton" type="button" onClick={()=>patch("palette",definition.palette.filter((_,i)=>i!==index))}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="aestheticPanel">
        <h3>Lighting language</h3>
        <div className="aestheticGrid">
          {(["quality","direction","colorTemperature","practicals","shadowCharacter"] as const).map((key)=>(
            <label key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><textarea value={definition.lighting[key]} onChange={(e)=>patch("lighting",{...definition.lighting,[key]:e.target.value})} /></label>
          ))}
        </div>
      </section>

      <section className="aestheticPanel">
        <h3>Surface, lens & provider guidance</h3>
        <div className="aestheticGrid">
          <label><span>Surface qualities</span><textarea value={definition.surfaceQualities.join("\n")} onChange={(e)=>patch("surfaceQualities",textList(e.target.value))} placeholder="worn chrome&#10;fogged glass" /></label>
          <label><span>Lens artifacts</span><textarea value={definition.lensArtifacts.join("\n")} onChange={(e)=>patch("lensArtifacts",textList(e.target.value))} placeholder="halation&#10;rare veiling flare" /></label>
          <label className="aestheticWide"><span>Preview asset version ID</span><input value={definition.previewAssetVersionId ?? ""} onChange={(e)=>patch("previewAssetVersionId",e.target.value.trim() || null)} placeholder="Optional exact READY reference asset version UUID" /></label>
          <label className="aestheticWide"><span>All reference asset version IDs</span><textarea value={references} onChange={(e)=>setReferences(e.target.value)} placeholder="One exact READY asset-version UUID per line" /></label>
        </div>
        <div className="aestheticRepeater">
          <div className="aestheticRepeaterHeader"><strong>Provider-specific hints</strong><button className="secondaryButton" type="button" onClick={()=>patch("providerHints",[...definition.providerHints,{provider:"",settings:""}])}>Add hint</button></div>
          {definition.providerHints.map((hint,index)=>(
            <div className="aestheticProviderRow" key={index}>
              <input value={hint.provider} onChange={(e)=>patch("providerHints",definition.providerHints.map((item,i)=>i===index?{...item,provider:e.target.value}:item))} placeholder="Provider/model" />
              <textarea value={hint.settings} onChange={(e)=>patch("providerHints",definition.providerHints.map((item,i)=>i===index?{...item,settings:e.target.value}:item))} placeholder="Provider-specific interpretation only; semantic style stays above." />
              <button className="secondaryButton" type="button" onClick={()=>patch("providerHints",definition.providerHints.filter((_,i)=>i!==index))}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="aestheticPanel aestheticPromptGrid">
        <label><span>Positive prompt language</span><textarea name="positivePrompt" defaultValue={defaults?.positivePrompt ?? ""} rows={5} /></label>
        <label><span>Negative prompt / exclusions</span><textarea name="negativePrompt" defaultValue={defaults?.negativePrompt ?? ""} rows={5} /></label>
        <label><span>Notes</span><textarea name="notes" defaultValue={defaults?.notes ?? ""} rows={4} /></label>
      </section>

      {issues.length ? <section className="aestheticIssues"><strong>Before this is production-ready:</strong><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></section> : <p className="aestheticReady">Structured aesthetic is complete.</p>}
      {error ? <p className="formError" role="alert">{error}</p> : null}
      <div className="formActions">
        <button className="primaryButton" disabled={pending} type="submit">{pending ? "Saving…" : mode === "create" ? "Create visual aesthetic" : "Create new aesthetic version"}</button>
        {moduleId ? <button className="secondaryButton" type="button" onClick={()=>router.push(`/app/library/${moduleId}`)}>Cancel</button> : null}
      </div>
    </form>
  );
}
