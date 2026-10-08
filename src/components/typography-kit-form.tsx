"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_TYPOGRAPHY_KIT,
  parseTypographyKitDefinition,
  typographyAlignmentValues,
  typographyCaseValues,
  typographyKitCompletionIssues,
  typographyRoleValues,
  type TypographyKitDefinition
} from "@/lib/typography-kit/schema";

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

function textList(raw:string):string[]{
  return [...new Set(raw.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean))];
}

function initialDefinition(value:unknown):TypographyKitDefinition{
  try{return parseTypographyKitDefinition(value);}
  catch{return EMPTY_TYPOGRAPHY_KIT;}
}

export function TypographyKitForm({mode,endpoint,moduleId,defaults}:Props){
  const router=useRouter();
  const [definition,setDefinition]=useState<TypographyKitDefinition>(()=>initialDefinition(defaults?.definition));
  const [references,setReferences]=useState(defaults?.referenceAssetVersionIds?.join("\n")??"");
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const issues=useMemo(()=>typographyKitCompletionIssues(definition),[definition]);

  function patch(values:Partial<TypographyKitDefinition>){setDefinition(current=>({...current,...values}));}

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setPending(true);setError(null);
    try{
      const form=new FormData(event.currentTarget);
      if(mode==="create")form.set("kind","TYPOGRAPHY_KIT");
      form.set("definition",JSON.stringify(definition));
      form.set("referenceAssetVersionIds",textList(references).join("\n"));
      const response=await fetch(endpoint,{method:"POST",body:form});
      const payload=(await response.json()) as {moduleId?:string;error?:string};
      if(!response.ok||!payload.moduleId){setError(payload.error??"Typography kit save failed.");return;}
      router.push(`/app/library/${payload.moduleId}`);router.refresh();
    }catch{setError("Typography kit save failed. Please try again.");}
    finally{setPending(false);}
  }

  return (
    <form className="typographyBuilder" onSubmit={submit}>
      {mode==="create"?(
        <section className="typePanel typeMeta">
          <label><span>Name</span><input name="name" required maxLength={160} autoFocus/></label>
          <label><span>Description</span><textarea name="description" rows={3} maxLength={5000}/></label>
          <label className="typeWide"><span>Tags</span><input name="tags" placeholder="condensed, titles, kinetic-type"/></label>
        </section>
      ):null}

      <section className="typePanel">
        <div className="typePanelHeader">
          <div><h3>Typography roles</h3><p>Define the hierarchy separately for titles, lyrics, captions, credits, or other text.</p></div>
          <button className="secondaryButton" type="button" onClick={()=>patch({roles:[...definition.roles,{role:"TITLE",label:"New role",fontFamily:"",fallbackFamily:"",weight:"",style:"",casing:"AS_TYPED",tracking:"",lineHeight:"",alignment:"CENTER",maxLines:null,notes:""}]})}>Add role</button>
        </div>
        <div className="typeRoles">
          {definition.roles.length===0?<p className="typeEmpty">No typography roles yet.</p>:null}
          {definition.roles.map((role,index)=>(
            <article className="typeRole" key={index}>
              <div className="typeRoleHeader"><strong>{role.label||`Role ${index+1}`}</strong><button className="secondaryButton" type="button" onClick={()=>patch({roles:definition.roles.filter((_,i)=>i!==index)})}>Remove</button></div>
              <div className="typeGrid">
                <label><span>Role</span><select value={role.role} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,role:e.target.value as typeof role.role}:item)})}>{typographyRoleValues.map(v=><option key={v}>{v}</option>)}</select></label>
                <label><span>Label</span><input value={role.label} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,label:e.target.value}:item)})}/></label>
                <label><span>Font family / description</span><input value={role.fontFamily} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,fontFamily:e.target.value}:item)})} placeholder="Condensed grotesk display face"/></label>
                <label><span>Fallback family</span><input value={role.fallbackFamily} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,fallbackFamily:e.target.value}:item)})} placeholder="Arial Narrow, sans-serif"/></label>
                <label><span>Weight</span><input value={role.weight} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,weight:e.target.value}:item)})}/></label>
                <label><span>Style</span><input value={role.style} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,style:e.target.value}:item)})}/></label>
                <label><span>Case</span><select value={role.casing} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,casing:e.target.value as typeof role.casing}:item)})}>{typographyCaseValues.map(v=><option key={v}>{v}</option>)}</select></label>
                <label><span>Alignment</span><select value={role.alignment} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,alignment:e.target.value as typeof role.alignment}:item)})}>{typographyAlignmentValues.map(v=><option key={v}>{v}</option>)}</select></label>
                <label><span>Tracking</span><input value={role.tracking} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,tracking:e.target.value}:item)})}/></label>
                <label><span>Line height</span><input value={role.lineHeight} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,lineHeight:e.target.value}:item)})}/></label>
                <label><span>Maximum lines</span><input type="number" min={1} max={20} value={role.maxLines??""} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,maxLines:e.target.value?Number(e.target.value):null}:item)})}/></label>
                <label><span>Notes</span><textarea value={role.notes} onChange={(e)=>patch({roles:definition.roles.map((item,i)=>i===index?{...item,notes:e.target.value}:item)})}/></label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="typePanel">
        <h3>Global behavior</h3>
        <div className="typeGrid">
          {([
            ["placement","Placement"],
            ["safeArea","Safe area"],
            ["colorSystem","Color system"],
            ["outlineShadow","Outline / shadow"],
            ["texture","Texture"],
            ["motion","Motion"],
            ["entrance","Entrance"],
            ["exit","Exit"],
            ["timing","Timing"],
            ["compositing","Compositing"],
            ["accessibility","Accessibility"]
          ] as const).map(([key,label])=>(
            <label key={key}><span>{label}</span><textarea value={definition[key]} onChange={(e)=>patch({[key]:e.target.value} as Partial<TypographyKitDefinition>)}/></label>
          ))}
          <label className="typeWide"><span>Exclusions</span><textarea value={definition.exclusions.join("\n")} onChange={(e)=>patch({exclusions:textList(e.target.value)})} placeholder="One prohibited typography behavior per line"/></label>
        </div>
      </section>

      <section className="typePanel typePromptGrid">
        <label><span>Positive prompt language</span><textarea name="positivePrompt" rows={5} defaultValue={defaults?.positivePrompt??""}/></label>
        <label><span>Negative prompt / exclusions</span><textarea name="negativePrompt" rows={5} defaultValue={defaults?.negativePrompt??""}/></label>
        <label className="typeWide"><span>Exact reference asset version IDs</span><textarea value={references} onChange={(e)=>setReferences(e.target.value)} rows={3} placeholder="Optional READY graphic/reference asset-version UUIDs"/></label>
        <label className="typeWide"><span>Notes</span><textarea name="notes" rows={4} defaultValue={defaults?.notes??""}/></label>
      </section>

      {issues.length?<section className="typeIssues"><strong>Before this typography kit is production-ready:</strong><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></section>:<p className="typeReady">Typography system is complete.</p>}
      {error?<p className="formError" role="alert">{error}</p>:null}
      <div className="formActions">
        <button className="primaryButton" type="submit" disabled={pending}>{pending?"Saving…":mode==="create"?"Create typography kit":"Create new typography version"}</button>
        {moduleId?<button className="secondaryButton" type="button" onClick={()=>router.push(`/app/library/${moduleId}`)}>Cancel</button>:null}
      </div>
    </form>
  );
}
