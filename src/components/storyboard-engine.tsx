"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StoryboardShotView{
  position:number;
  shotId:string;
  shotVersionId:string;
  nodeId:string;
  versionNumber:number;
  lifecycle:string;
  label:string|null;
  startMs:number|null;
  endMs:number|null;
  dramaticPurpose:string|null;
  subject:string|null;
  action:string|null;
  environment:string|null;
  framingIntent:string|null;
  cameraIntent:string|null;
  continuityNotes:string|null;
  transitionIn:string|null;
  transitionOut:string|null;
  visualIntensity:number;
  beat:string;
  origin:string;
  generationJobId:string|null;
}

interface StoryboardSequenceView{
  position:number;
  sequenceVersionId:string;
  sequenceNodeId:string;
  sequenceVersionNumber:number;
  sequenceLifecycle:string;
  title:string;
  startMs:number|null;
  endMs:number|null;
  targetShotCount:number|null;
  shots:StoryboardShotView[];
}

interface Props{
  projectId:string;
  sourceReady:boolean;
  providerAvailable:boolean;
  needsRegeneration:boolean;
  recentJob:{
    id:string;
    status:string;
    progressPercent:number;
    progressMessage:string|null;
    errorMessage:string|null;
  }|null;
  storyboard:{sequences:StoryboardSequenceView[]};
  wizardRevision:number;
  wizardStatus:string;
  wizardLocked:boolean;
}

function ms(value:number|null):string{
  if(value===null) return "—";
  const seconds=value/1000;
  const minutes=Math.floor(seconds/60);
  return `${minutes}:${(seconds%60).toFixed(2).padStart(5,"0")}`;
}

function midpoint(shot:StoryboardShotView):number{
  return Math.floor(((shot.startMs??0)+(shot.endMs??0))/2);
}

export function StoryboardEngine({
  projectId,
  sourceReady,
  providerAvailable,
  needsRegeneration,
  recentJob,
  storyboard,
  wizardRevision,
  wizardStatus,
  wizardLocked
}:Props){
  const router=useRouter();
  const [direction,setDirection]=useState("");
  const [sequences,setSequences]=useState(storyboard.sequences);
  const [splitPoints,setSplitPoints]=useState<Record<string,string>>({});
  const [regenDirections,setRegenDirections]=useState<Record<string,string>>({});
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const active=recentJob?.status==="QUEUED"||recentJob?.status==="RUNNING";
  const editing=wizardStatus!=="COMPLETED"&&!wizardLocked&&!active;

  useEffect(()=>{
    setSequences(storyboard.sequences);
  },[storyboard]);

  useEffect(()=>{
    if(!active) return;
    const timer=window.setInterval(()=>router.refresh(),2500);
    return ()=>window.clearInterval(timer);
  },[active,router]);

  async function request(
    path:string,
    body:Record<string,unknown>,
    options?:{reload?:boolean}
  ){
    setPending(true);
    setError(null);
    try{
      const response=await fetch(path,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body)
      });
      const payload=(await response.json()) as {error?:string};
      if(!response.ok){
        setError(payload.error??"Storyboard request failed.");
        return false;
      }
      if(options?.reload!==false){
        window.location.reload();
      }else{
        router.refresh();
      }
      return true;
    }catch{
      setError("Storyboard request failed. Please try again.");
      return false;
    }finally{
      setPending(false);
    }
  }

  async function generate(){
    const ok=await request(
      `/api/projects/${projectId}/storyboard/generate`,
      {
        expectedWizardRevision:wizardRevision,
        direction
      },
      {reload:false}
    );
    if(ok) setDirection("");
  }

  function patchShot(
    sequenceIndex:number,
    shotIndex:number,
    values:Partial<StoryboardShotView>
  ){
    setSequences(current=>current.map((sequence,sIndex)=>
      sIndex!==sequenceIndex
        ? sequence
        : {
            ...sequence,
            shots:sequence.shots.map((shot,index)=>
              index===shotIndex?{...shot,...values}:shot
            )
          }
    ));
  }

  async function rewriteShot(shot:StoryboardShotView){
    await request(`/api/projects/${projectId}/storyboard`,{
      action:"rewrite",
      expectedWizardRevision:wizardRevision,
      shotVersionId:shot.shotVersionId,
      fields:{
        label:shot.label??"Storyboard shot",
        dramaticPurpose:shot.dramaticPurpose??"",
        beat:shot.beat,
        subject:shot.subject??"",
        action:shot.action??"",
        environment:shot.environment??"",
        framingIntent:shot.framingIntent??"",
        cameraIntent:shot.cameraIntent??"",
        continuityNotes:shot.continuityNotes??"",
        transitionIn:shot.transitionIn??"",
        transitionOut:shot.transitionOut??"",
        visualIntensity:shot.visualIntensity
      }
    });
  }

  async function splitShot(shot:StoryboardShotView){
    const raw=splitPoints[shot.shotVersionId];
    const splitAtMs=raw?Number(raw):midpoint(shot);
    await request(`/api/projects/${projectId}/storyboard`,{
      action:"split",
      expectedWizardRevision:wizardRevision,
      shotVersionId:shot.shotVersionId,
      splitAtMs
    });
  }

  async function duplicateShot(shot:StoryboardShotView){
    await request(`/api/projects/${projectId}/storyboard`,{
      action:"duplicate",
      expectedWizardRevision:wizardRevision,
      shotVersionId:shot.shotVersionId
    });
  }

  async function mergeWithNext(
    shot:StoryboardShotView,
    next:StoryboardShotView
  ){
    await request(`/api/projects/${projectId}/storyboard`,{
      action:"merge",
      expectedWizardRevision:wizardRevision,
      firstShotVersionId:shot.shotVersionId,
      secondShotVersionId:next.shotVersionId
    });
  }

  async function moveShot(
    sequence:StoryboardSequenceView,
    shotIndex:number,
    delta:number
  ){
    const target=shotIndex+delta;
    if(target<0||target>=sequence.shots.length) return;
    const ordered=sequence.shots.map(shot=>shot.shotVersionId);
    [ordered[shotIndex],ordered[target]]=[ordered[target]!,ordered[shotIndex]!];
    await request(`/api/projects/${projectId}/storyboard`,{
      action:"reorder",
      expectedWizardRevision:wizardRevision,
      sequenceVersionId:sequence.sequenceVersionId,
      orderedShotVersionIds:ordered
    });
  }

  async function regenerateShot(shot:StoryboardShotView){
    await request(
      `/api/projects/${projectId}/storyboard/regenerate`,
      {
        expectedWizardRevision:wizardRevision,
        shotVersionId:shot.shotVersionId,
        direction:regenDirections[shot.shotVersionId]??""
      },
      {reload:false}
    );
  }

  const shotCount=sequences.reduce(
    (sum,sequence)=>sum+sequence.shots.length,
    0
  );

  return (
    <div className="storyboardEngine">
      {!sourceReady?(
        <section className="storyboardEmpty">
          <h2>Lock the Sequence Map first.</h2>
          <p>
            Storyboard generation uses the exact locked sequence versions and
            will not plan against a moving source.
          </p>
        </section>
      ):(
        <>
          <section className="storyboardGenerate">
            <div>
              <p className="eyebrow">Storyboard Engine + Editor</p>
              <h2>Generate the complete storyboard, then refine shot by shot.</h2>
              <p>
                Full generation creates a versioned storyboard across every
                locked sequence. Manual changes and targeted regeneration create
                new ShotVersions rather than rewriting history.
              </p>
            </div>
            <label>
              <span>Additional direction for full storyboard pass</span>
              <textarea
                value={direction}
                onChange={event=>setDirection(event.target.value)}
                placeholder="Optional direction for a new complete storyboard pass."
                disabled={active||pending||wizardLocked}
              />
            </label>
            <button
              className="primaryButton"
              type="button"
              disabled={
                active||pending||wizardLocked||!providerAvailable||!sourceReady
              }
              onClick={generate}
            >
              {active
                ? "Generating…"
                : shotCount
                  ? "Generate new storyboard pass"
                  : "Generate complete storyboard"}
            </button>
            {!providerAvailable?(
              <p className="storyboardWarning">
                A configured text-generation provider is required for generation
                and targeted regeneration.
              </p>
            ):null}
          </section>

          {recentJob?(
            <section className="storyboardJob">
              <div>
                <span>{recentJob.status}</span>
                <strong>{recentJob.progressPercent}%</strong>
              </div>
              <p>
                {recentJob.progressMessage||
                  recentJob.errorMessage||
                  "Storyboard job recorded."}
              </p>
            </section>
          ):null}

          {needsRegeneration&&shotCount?(
            <section className="storyboardWarning">
              The locked Sequence Map changed. Generate a new storyboard pass
              before relying on these shots.
            </section>
          ):null}

          {shotCount?(
            <section className="storyboardLifecycle">
              <div>
                <span>Storyboard stage</span>
                <strong>{wizardStatus.replaceAll("_"," ")}</strong>
                {wizardLocked?<em>Locked</em>:null}
              </div>
              <div className="storyboardLifecycleActions">
                {wizardStatus==="COMPLETED"&&!wizardLocked?(
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={pending||active}
                    onClick={()=>request(
                      `/api/projects/${projectId}/storyboard`,
                      {action:"reopen",expectedWizardRevision:wizardRevision}
                    )}
                  >
                    Reopen for editing
                  </button>
                ):null}
                {wizardStatus!=="COMPLETED"&&!wizardLocked?(
                  <button
                    className="primaryButton"
                    type="button"
                    disabled={pending||active}
                    onClick={()=>request(
                      `/api/projects/${projectId}/storyboard`,
                      {action:"complete",expectedWizardRevision:wizardRevision}
                    )}
                  >
                    Complete storyboard
                  </button>
                ):null}
                {wizardStatus==="COMPLETED"&&!wizardLocked?(
                  <button
                    className="primaryButton"
                    type="button"
                    disabled={pending||active}
                    onClick={()=>request(
                      `/api/projects/${projectId}/storyboard`,
                      {action:"lock",expectedWizardRevision:wizardRevision}
                    )}
                  >
                    Lock storyboard
                  </button>
                ):null}
              </div>
            </section>
          ):null}

          {sequences.length?(
            <section className="storyboardPlan">
              <div className="storyboardSummary">
                <div><span>Sequences</span><strong>{sequences.length}</strong></div>
                <div><span>Shots</span><strong>{shotCount}</strong></div>
                <div><span>Stage</span><strong>{wizardStatus.replaceAll("_"," ")}</strong></div>
              </div>

              {sequences.map((sequence,sequenceIndex)=>(
                <article
                  className="storyboardSequence"
                  key={sequence.sequenceVersionId}
                >
                  <header>
                    <div>
                      <p className="eyebrow">
                        Sequence {sequence.position+1} · v{sequence.sequenceVersionNumber}
                      </p>
                      <h3>{sequence.title}</h3>
                    </div>
                    <span>
                      {ms(sequence.startMs)}–{ms(sequence.endMs)}
                    </span>
                  </header>
                  {sequence.targetShotCount!==null?(
                    <p className="storyboardTarget">
                      Target shot count: {sequence.targetShotCount}
                    </p>
                  ):null}

                  <div className="storyboardShots">
                    {sequence.shots.map((shot,shotIndex)=>{
                      const next=sequence.shots[shotIndex+1]??null;
                      return (
                        <article
                          className="storyboardShot storyboardShotEditable"
                          key={shot.shotVersionId}
                        >
                          <div className="storyboardShotTop">
                            <div>
                              <span>
                                Shot {shotIndex+1} · v{shot.versionNumber} · {shot.origin}
                              </span>
                              <input
                                className="storyboardShotTitle"
                                value={shot.label??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,
                                  shotIndex,
                                  {label:event.target.value}
                                )}
                              />
                            </div>
                            <strong>{ms(shot.startMs)}–{ms(shot.endMs)}</strong>
                          </div>

                          <div className="storyboardEditorGrid">
                            <label className="storyboardWide">
                              <span>Visual beat</span>
                              <textarea
                                value={shot.beat}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{beat:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Dramatic purpose</span>
                              <textarea
                                value={shot.dramaticPurpose??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,
                                  {dramaticPurpose:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Subject</span>
                              <textarea
                                value={shot.subject??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{subject:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Action</span>
                              <textarea
                                value={shot.action??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{action:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Environment</span>
                              <textarea
                                value={shot.environment??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{environment:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Framing intent</span>
                              <textarea
                                value={shot.framingIntent??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{framingIntent:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Camera intent</span>
                              <textarea
                                value={shot.cameraIntent??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{cameraIntent:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Continuity</span>
                              <textarea
                                value={shot.continuityNotes??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,
                                  {continuityNotes:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Visual intensity</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={shot.visualIntensity}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,
                                  {visualIntensity:Number(event.target.value)}
                                )}
                              />
                            </label>
                            <label>
                              <span>Transition in</span>
                              <textarea
                                value={shot.transitionIn??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{transitionIn:event.target.value}
                                )}
                              />
                            </label>
                            <label>
                              <span>Transition out</span>
                              <textarea
                                value={shot.transitionOut??""}
                                disabled={!editing}
                                onChange={event=>patchShot(
                                  sequenceIndex,shotIndex,{transitionOut:event.target.value}
                                )}
                              />
                            </label>
                          </div>

                          {editing?(
                            <>
                              <div className="storyboardEditActions">
                                <button
                                  className="primaryButton"
                                  type="button"
                                  disabled={pending}
                                  onClick={()=>rewriteShot(shot)}
                                >
                                  Save rewrite
                                </button>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  disabled={pending||shotIndex===0}
                                  onClick={()=>moveShot(sequence,shotIndex,-1)}
                                >
                                  Move up
                                </button>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  disabled={pending||shotIndex===sequence.shots.length-1}
                                  onClick={()=>moveShot(sequence,shotIndex,1)}
                                >
                                  Move down
                                </button>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  disabled={pending}
                                  onClick={()=>duplicateShot(shot)}
                                >
                                  Duplicate
                                </button>
                                {next?(
                                  <button
                                    className="secondaryButton"
                                    type="button"
                                    disabled={pending}
                                    onClick={()=>mergeWithNext(shot,next)}
                                  >
                                    Merge with next
                                  </button>
                                ):null}
                              </div>

                              <div className="storyboardSplitControl">
                                <label>
                                  <span>Split at ms</span>
                                  <input
                                    type="number"
                                    min={(shot.startMs??0)+1}
                                    max={(shot.endMs??1)-1}
                                    value={
                                      splitPoints[shot.shotVersionId]??
                                      String(midpoint(shot))
                                    }
                                    onChange={event=>setSplitPoints(current=>({
                                      ...current,
                                      [shot.shotVersionId]:event.target.value
                                    }))}
                                  />
                                </label>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  disabled={pending}
                                  onClick={()=>splitShot(shot)}
                                >
                                  Split shot
                                </button>
                              </div>

                              <div className="storyboardRegenerateControl">
                                <textarea
                                  value={regenDirections[shot.shotVersionId]??""}
                                  onChange={event=>setRegenDirections(current=>({
                                    ...current,
                                    [shot.shotVersionId]:event.target.value
                                  }))}
                                  placeholder="Optional direction for targeted AI regeneration of this shot."
                                  disabled={!providerAvailable||pending||active}
                                />
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  disabled={!providerAvailable||pending||active}
                                  onClick={()=>regenerateShot(shot)}
                                >
                                  Regenerate this shot
                                </button>
                              </div>
                            </>
                          ):null}
                        </article>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>
          ):null}

          {error?<p className="formError" role="alert">{error}</p>:null}
        </>
      )}
    </div>
  );
}
