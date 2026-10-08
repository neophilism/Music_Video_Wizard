"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_MOTIF,
  motifCompletionIssues,
  motifRecurrenceModeValues,
  motifTypeValues,
  parseMotifDefinition,
  type MotifDefinition
} from "@/lib/motif/schema";

interface Props {
  mode: "create" | "version";
  endpoint: string;
  moduleId?: string;
  defaults?: {
    definition?: unknown;
    positivePrompt?: string;
    negativePrompt?: string;
    notes?: string;
    referenceAssetVersionIds?: string[];
  };
}

function textList(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]+/).map((value)=>value.trim()).filter(Boolean))];
}

function initialDefinition(value: unknown): MotifDefinition {
  try { return parseMotifDefinition(value); }
  catch { return EMPTY_MOTIF; }
}

function optionalCount(raw: string): number | null {
  const trimmed=raw.trim();
  if (!trimmed) return null;
  const value=Number(trimmed);
  return Number.isFinite(value) ? Math.max(0,Math.trunc(value)) : null;
}

export function MotifForm({mode,endpoint,moduleId,defaults}:Props){
  const router=useRouter();
  const [definition,setDefinition]=useState<MotifDefinition>(()=>initialDefinition(defaults?.definition));
  const [references,setReferences]=useState(defaults?.referenceAssetVersionIds?.join("\n")??"");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const issues=useMemo(()=>motifCompletionIssues(definition),[definition]);

  function patch(values:Partial<MotifDefinition>){
    setDefinition((current)=>({...current,...values}));
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setPending(true);setError(null);
    try{
      const form=new FormData(event.currentTarget);
      if(mode==="create") form.set("kind","MOTIF");
      form.set("definition",JSON.stringify(definition));
      form.set("referenceAssetVersionIds",textList(references).join("\n"));
      const response=await fetch(endpoint,{method:"POST",body:form});
      const payload=(await response.json()) as {moduleId?:string;error?:string};
      if(!response.ok||!payload.moduleId){setError(payload.error??"Motif save failed.");return;}
      router.push(`/app/library/${payload.moduleId}`);
      router.refresh();
    }catch{setError("Motif save failed. Please try again.");}
    finally{setPending(false);}
  }

  return (
    <form className="motifBuilder" onSubmit={submit}>
      {mode==="create"?(
        <section className="motifPanel motifMeta">
          <label><span>Name</span><input name="name" required maxLength={160} autoFocus /></label>
          <label><span>Description</span><textarea name="description" rows={3} maxLength={5000}/></label>
          <label className="motifWide"><span>Tags</span><input name="tags" placeholder="recurring, symbolic, amber-light"/></label>
        </section>
      ):null}

      <section className="motifPanel">
        <h3>Identity & meaning</h3>
        <div className="motifGrid">
          <label><span>Motif type</span><select value={definition.motifType} onChange={(e)=>patch({motifType:e.target.value as MotifDefinition["motifType"]})}>{motifTypeValues.map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Visual signature</span><textarea value={definition.visualSignature} onChange={(e)=>patch({visualSignature:e.target.value})} placeholder="What must remain visually recognizable?"/></label>
          <label><span>Semantic function</span><textarea value={definition.semanticFunction} onChange={(e)=>patch({semanticFunction:e.target.value})} placeholder="What does this motif mean or accomplish?"/></label>
          <label><span>Introduction</span><textarea value={definition.introduction} onChange={(e)=>patch({introduction:e.target.value})} placeholder="How should the motif first appear?"/></label>
          <label className="motifWide"><span>Evolution</span><textarea value={definition.evolution} onChange={(e)=>patch({evolution:e.target.value})} placeholder="How does the motif transform, escalate, or deliberately remain fixed?"/></label>
          <label className="motifWide"><span>Continuity guidance</span><textarea value={definition.continuity} onChange={(e)=>patch({continuity:e.target.value})}/></label>
        </div>
      </section>

      <section className="motifPanel">
        <h3>Recurrence system</h3>
        <div className="motifGrid motifRecurrenceGrid">
          <label><span>Recurrence mode</span><select value={definition.recurrence.mode} onChange={(e)=>patch({recurrence:{...definition.recurrence,mode:e.target.value as MotifDefinition["recurrence"]["mode"]}})}>{motifRecurrenceModeValues.map(v=><option key={v}>{v}</option>)}</select></label>
          <label><span>Minimum occurrences</span><input type="number" min={0} max={100} value={definition.recurrence.minimumOccurrences??""} onChange={(e)=>patch({recurrence:{...definition.recurrence,minimumOccurrences:optionalCount(e.target.value)}})}/></label>
          <label><span>Maximum occurrences</span><input type="number" min={1} max={100} value={definition.recurrence.maximumOccurrences??""} onChange={(e)=>patch({recurrence:{...definition.recurrence,maximumOccurrences:optionalCount(e.target.value)}})}/></label>
          <label className="motifWide"><span>Cue guidance</span><textarea value={definition.recurrence.cueGuidance} onChange={(e)=>patch({recurrence:{...definition.recurrence,cueGuidance:e.target.value}})} placeholder="Musical, lyrical, dramatic, or visual conditions that call for recurrence."/></label>
        </div>
      </section>

      <section className="motifPanel">
        <h3>Variation & exclusions</h3>
        <div className="motifGrid">
          <label><span>Variation rules</span><textarea value={definition.variationRules.join("\n")} onChange={(e)=>patch({variationRules:textList(e.target.value)})} placeholder="One permitted variation per line"/></label>
          <label><span>Prohibited uses</span><textarea value={definition.prohibitedUses.join("\n")} onChange={(e)=>patch({prohibitedUses:textList(e.target.value)})} placeholder="One misuse/exclusion per line"/></label>
        </div>
      </section>

      <section className="motifPanel motifPromptGrid">
        <label><span>Positive prompt language</span><textarea name="positivePrompt" rows={5} defaultValue={defaults?.positivePrompt??""}/></label>
        <label><span>Negative prompt / exclusions</span><textarea name="negativePrompt" rows={5} defaultValue={defaults?.negativePrompt??""}/></label>
        <label className="motifWide"><span>Exact reference asset version IDs</span><textarea value={references} onChange={(e)=>setReferences(e.target.value)} rows={3} placeholder="Optional READY asset-version UUIDs, one per line"/></label>
        <label className="motifWide"><span>Notes</span><textarea name="notes" rows={4} defaultValue={defaults?.notes??""}/></label>
      </section>

      {issues.length?<section className="motifIssues"><strong>Before this motif is production-ready:</strong><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></section>:<p className="motifReady">Structured motif is complete.</p>}
      {error?<p className="formError" role="alert">{error}</p>:null}
      <div className="formActions">
        <button className="primaryButton" type="submit" disabled={pending}>{pending?"Saving…":mode==="create"?"Create motif":"Create new motif version"}</button>
        {moduleId?<button className="secondaryButton" type="button" onClick={()=>router.push(`/app/library/${moduleId}`)}>Cancel</button>:null}
      </div>
    </form>
  );
}
