"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  creativeGrammarCompletionIssues,
  creativeGrammarKinds,
  emptyCreativeGrammar,
  grammarRuleStrengthValues,
  parseCreativeGrammarDefinition,
  type CreativeGrammarDefinition,
  type CreativeGrammarKind
} from "@/lib/creative-grammar/schema";

interface Props {
  mode: "create" | "version";
  endpoint: string;
  moduleId?: string;
  fixedKind?: CreativeGrammarKind;
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

type ControlField = { key: string; label: string; placeholder: string };

const controlFields: Record<CreativeGrammarKind, ControlField[]> = {
  CINEMATOGRAPHY_GRAMMAR: [
    { key: "lensFamily", label: "Lens family", placeholder: "Prime/zoom language, optical character..." },
    { key: "focalLengthBehavior", label: "Focal-length behavior", placeholder: "Wide bias, compression rules, when focal length changes..." },
    { key: "depthOfField", label: "Depth of field", placeholder: "Deep focus, selective focus, exceptions..." },
    { key: "focusBehavior", label: "Focus behavior", placeholder: "Rack-focus rules, breathing tolerance, subject priority..." },
    { key: "exposureBehavior", label: "Exposure behavior", placeholder: "Highlight protection, underexposure, silhouette rules..." },
    { key: "cameraHeight", label: "Camera height", placeholder: "Eye level, low, high, and when to depart..." },
    { key: "cameraAngle", label: "Camera angle", placeholder: "Level, canted, overhead, profile rules..." }
  ],
  COMPOSITION_GRAMMAR: [
    { key: "subjectPlacement", label: "Subject placement", placeholder: "Centered, thirds, edge pressure, exceptions..." },
    { key: "negativeSpace", label: "Negative space", placeholder: "How empty space carries tension or lyric meaning..." },
    { key: "symmetry", label: "Symmetry", placeholder: "When symmetry is preferred, broken, or prohibited..." },
    { key: "depthLayering", label: "Depth layering", placeholder: "Foreground/midground/background relationship..." },
    { key: "headroom", label: "Headroom", placeholder: "Tight, generous, dynamic rules..." },
    { key: "leadRoom", label: "Lead room", placeholder: "Look-space and movement-space behavior..." },
    { key: "horizonBehavior", label: "Horizon behavior", placeholder: "Level, displaced, hidden, intentionally broken..." }
  ],
  MOTION_GRAMMAR: [
    { key: "cameraMovement", label: "Camera movement", placeholder: "Handheld, dolly, crane, orbit, static rules..." },
    { key: "subjectMovement", label: "Subject movement", placeholder: "How subjects initiate, resist, or answer motion..." },
    { key: "stability", label: "Stability", placeholder: "Locked, controlled handheld, unstable thresholds..." },
    { key: "speed", label: "Speed", placeholder: "Default movement speed and musical exceptions..." },
    { key: "acceleration", label: "Acceleration", placeholder: "Ease, snap, ramp, deceleration rules..." },
    { key: "motivation", label: "Motivation", placeholder: "What is allowed to motivate a camera move..." },
    { key: "startStopBehavior", label: "Start / stop behavior", placeholder: "How moves begin, land, and hand off to edits..." }
  ],
  PERFORMANCE_GRAMMAR: [
    { key: "presence", label: "Presence", placeholder: "Direct, interior, confrontational, detached..." },
    { key: "facialExpression", label: "Facial expression", placeholder: "Range, restraint, intensity progression..." },
    { key: "bodyLanguage", label: "Body language", placeholder: "Gesture scale, posture, physical confidence..." },
    { key: "eyeline", label: "Eyeline", placeholder: "Lens contact, off-camera focus, shifts..." },
    { key: "choreography", label: "Choreography", placeholder: "Blocking and movement vocabulary..." },
    { key: "lipSync", label: "Lip sync", placeholder: "Full, selective, absent, stylized timing..." },
    { key: "interaction", label: "Interaction", placeholder: "Rules for ensemble or environment interaction..." }
  ],
  EDITING_GRAMMAR: [
    { key: "cutLogic", label: "Cut logic", placeholder: "What justifies a cut and what never does..." },
    { key: "shotDuration", label: "Shot duration", placeholder: "Baseline hold times and section-dependent changes..." },
    { key: "rhythmicRelationship", label: "Rhythmic relationship", placeholder: "Beat, bar, phrase, syncopation, deliberate resistance..." },
    { key: "continuity", label: "Continuity", placeholder: "Spatial, temporal, graphic, emotional continuity rules..." },
    { key: "montage", label: "Montage", placeholder: "Density, logic, escalation, compression..." },
    { key: "repetition", label: "Repetition", placeholder: "When shots or gestures may recur and why..." },
    { key: "timeManipulation", label: "Time manipulation", placeholder: "Speed ramps, holds, reversals, temporal ellipsis..." }
  ],
  TRANSITION_GRAMMAR: [
    { key: "defaultTransition", label: "Default transition", placeholder: "Hard cut, dissolve, match cut, in-camera handoff..." },
    { key: "matchRules", label: "Match rules", placeholder: "Graphic, motion, color, shape, eyeline matches..." },
    { key: "temporalBridges", label: "Temporal bridges", placeholder: "How time jumps or overlaps are expressed..." },
    { key: "graphicalBridges", label: "Graphical bridges", placeholder: "Shapes, textures, occlusion, wipes, overlays..." },
    { key: "audioLedTransitions", label: "Audio-led transitions", placeholder: "How musical or vocal events lead picture changes..." },
    { key: "prohibitedTransitions", label: "Prohibited transitions", placeholder: "Transitions that violate the visual language..." }
  ]
};

function textList(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))];
}

function kindLabel(kind: CreativeGrammarKind): string {
  return kind.replace("_GRAMMAR", "").replaceAll("_", " ").toLowerCase();
}

function initialDefinition(
  value: unknown,
  fallbackKind: CreativeGrammarKind
): CreativeGrammarDefinition {
  try {
    return parseCreativeGrammarDefinition(value);
  } catch {
    return emptyCreativeGrammar(fallbackKind);
  }
}

export function CreativeGrammarForm({
  mode,
  endpoint,
  moduleId,
  fixedKind,
  defaults
}: Props) {
  const router = useRouter();
  const fallbackKind = fixedKind ?? "CINEMATOGRAPHY_GRAMMAR";
  const [definition, setDefinition] = useState<CreativeGrammarDefinition>(() =>
    initialDefinition(defaults?.definition, fallbackKind)
  );
  const [references, setReferences] = useState(
    defaults?.referenceAssetVersionIds?.join("\n") ?? ""
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issues = useMemo(
    () => creativeGrammarCompletionIssues(definition),
    [definition]
  );

  function patch(values: Partial<CreativeGrammarDefinition>) {
    setDefinition((current) => ({ ...current, ...values }) as CreativeGrammarDefinition);
  }

  function patchControl(key: string, value: string) {
    setDefinition((current) => ({
      ...current,
      controls: {
        ...(current.controls as Record<string, string>),
        [key]: value
      }
    }) as CreativeGrammarDefinition);
  }

  function switchKind(kind: CreativeGrammarKind) {
    setDefinition(emptyCreativeGrammar(kind));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const form = new FormData(event.currentTarget);
      if (mode === "create") form.set("kind", definition.grammarKind);
      form.set("definition", JSON.stringify(definition));
      form.set("referenceAssetVersionIds", textList(references).join("\n"));

      const response = await fetch(endpoint, { method: "POST", body: form });
      const payload = (await response.json()) as { moduleId?: string; error?: string };
      if (!response.ok || !payload.moduleId) {
        setError(payload.error ?? "Creative grammar save failed.");
        return;
      }

      router.push(`/app/library/${payload.moduleId}`);
      router.refresh();
    } catch {
      setError("Creative grammar save failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const controls = definition.controls as Record<string, string>;

  return (
    <form className="creativeGrammarBuilder" onSubmit={submit}>
      {mode === "create" ? (
        <section className="grammarPanel grammarMeta">
          <label>
            <span>Grammar family</span>
            <select
              value={definition.grammarKind}
              onChange={(event) => switchKind(event.target.value as CreativeGrammarKind)}
            >
              {creativeGrammarKinds.map((kind) => (
                <option value={kind} key={kind}>{kindLabel(kind)}</option>
              ))}
            </select>
          </label>
          <label><span>Name</span><input name="name" required maxLength={160} defaultValue={defaults?.name ?? ""} /></label>
          <label className="grammarWide"><span>Description</span><textarea name="description" rows={3} maxLength={5000} defaultValue={defaults?.description ?? ""} /></label>
          <label className="grammarWide"><span>Tags</span><input name="tags" defaultValue={defaults?.tags?.join(", ") ?? ""} placeholder="handheld, restrained, phrase-led" /></label>
        </section>
      ) : (
        <section className="grammarIdentity">
          <span>Grammar family</span>
          <strong>{kindLabel(definition.grammarKind)}</strong>
        </section>
      )}

      <section className="grammarPanel">
        <h3>Purpose & scope</h3>
        <div className="grammarGrid">
          <label><span>Intent</span><textarea value={definition.intent} onChange={(event)=>patch({intent:event.target.value})} placeholder="What should this grammar make the video feel like?" /></label>
          <label><span>Scope</span><textarea value={definition.scope} onChange={(event)=>patch({scope:event.target.value})} placeholder="Project default, specific sequences, performance passages..." /></label>
          <label className="grammarWide"><span>Continuity guidance</span><textarea value={definition.continuity} onChange={(event)=>patch({continuity:event.target.value})} placeholder="How this grammar should remain legible across cuts, scenes, or generated clips." /></label>
          <label className="grammarWide"><span>Explicit exceptions</span><textarea value={definition.exceptions.join("\n")} onChange={(event)=>patch({exceptions:textList(event.target.value)})} placeholder="One exception per line" /></label>
        </div>
      </section>

      <section className="grammarPanel">
        <div className="grammarPanelHeader">
          <div>
            <h3>Rules</h3>
            <p>Rules carry strength and trigger information so later stages can resolve conflicts deliberately.</p>
          </div>
          <button
            className="secondaryButton"
            type="button"
            onClick={()=>patch({
              rules:[
                ...definition.rules,
                { trigger:"default", directive:"", strength:"PREFER", rationale:"" }
              ]
            })}
          >
            Add rule
          </button>
        </div>

        <div className="grammarRules">
          {definition.rules.length === 0 ? <p className="grammarEmpty">No explicit rules yet.</p> : null}
          {definition.rules.map((rule,index)=>(
            <article className="grammarRule" key={index}>
              <div className="grammarRuleHeader">
                <strong>Rule {index + 1}</strong>
                <button className="secondaryButton" type="button" onClick={()=>patch({rules:definition.rules.filter((_,i)=>i!==index)})}>Remove</button>
              </div>
              <div className="grammarRuleGrid">
                <label><span>Trigger</span><input value={rule.trigger} onChange={(event)=>patch({rules:definition.rules.map((item,i)=>i===index?{...item,trigger:event.target.value}:item)})} placeholder="default, chorus peak, intimate verse..." /></label>
                <label><span>Strength</span><select value={rule.strength} onChange={(event)=>patch({rules:definition.rules.map((item,i)=>i===index?{...item,strength:event.target.value as typeof rule.strength}:item)})}>{grammarRuleStrengthValues.map((strength)=><option key={strength}>{strength}</option>)}</select></label>
                <label className="grammarWide"><span>Directive</span><textarea value={rule.directive} onChange={(event)=>patch({rules:definition.rules.map((item,i)=>i===index?{...item,directive:event.target.value}:item)})} /></label>
                <label className="grammarWide"><span>Rationale</span><textarea value={rule.rationale} onChange={(event)=>patch({rules:definition.rules.map((item,i)=>i===index?{...item,rationale:event.target.value}:item)})} /></label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grammarPanel">
        <h3>{kindLabel(definition.grammarKind)} controls</h3>
        <div className="grammarGrid">
          {controlFields[definition.grammarKind].map((field)=>(
            <label key={field.key}>
              <span>{field.label}</span>
              <textarea
                value={controls[field.key] ?? ""}
                onChange={(event)=>patchControl(field.key,event.target.value)}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grammarPanel">
        <div className="grammarPanelHeader">
          <div>
            <h3>Provider interpretation hints</h3>
            <p>Optional implementation hints. The semantic grammar remains provider-neutral.</p>
          </div>
          <button className="secondaryButton" type="button" onClick={()=>patch({providerHints:[...definition.providerHints,{provider:"",settings:""}]})}>Add hint</button>
        </div>
        <div className="grammarHints">
          {definition.providerHints.map((hint,index)=>(
            <div className="grammarHintRow" key={index}>
              <input value={hint.provider} onChange={(event)=>patch({providerHints:definition.providerHints.map((item,i)=>i===index?{...item,provider:event.target.value}:item)})} placeholder="Provider/model" />
              <textarea value={hint.settings} onChange={(event)=>patch({providerHints:definition.providerHints.map((item,i)=>i===index?{...item,settings:event.target.value}:item)})} placeholder="How this provider should interpret the grammar." />
              <button className="secondaryButton" type="button" onClick={()=>patch({providerHints:definition.providerHints.filter((_,i)=>i!==index)})}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="grammarPanel grammarPromptGrid">
        <label><span>Positive prompt language</span><textarea name="positivePrompt" rows={5} defaultValue={defaults?.positivePrompt ?? ""} /></label>
        <label><span>Negative prompt / exclusions</span><textarea name="negativePrompt" rows={5} defaultValue={defaults?.negativePrompt ?? ""} /></label>
        <label className="grammarWide"><span>Exact reference asset version IDs</span><textarea value={references} onChange={(event)=>setReferences(event.target.value)} rows={3} placeholder="Optional READY asset-version UUIDs, one per line" /></label>
        <label className="grammarWide"><span>Notes</span><textarea name="notes" rows={4} defaultValue={defaults?.notes ?? ""} /></label>
      </section>

      {issues.length ? (
        <section className="grammarIssues">
          <strong>Before this grammar is production-ready:</strong>
          <ul>{issues.map((issue)=><li key={issue}>{issue}</li>)}</ul>
        </section>
      ) : <p className="grammarReady">Structured grammar is complete.</p>}

      {error ? <p className="formError" role="alert">{error}</p> : null}

      <div className="formActions">
        <button className="primaryButton" disabled={pending} type="submit">
          {pending ? "Saving…" : mode === "create" ? "Create creative grammar" : "Create new grammar version"}
        </button>
        {moduleId ? <button className="secondaryButton" type="button" onClick={()=>router.push(`/app/library/${moduleId}`)}>Cancel</button> : null}
      </div>
    </form>
  );
}
