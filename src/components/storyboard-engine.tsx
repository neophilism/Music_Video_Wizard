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
  generationJobId:string;
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
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const active=recentJob?.status==="QUEUED"||recentJob?.status==="RUNNING";

  useEffect(()=>{
    if(!active) return;
    const timer=window.setInterval(()=>router.refresh(),2500);
    return ()=>window.clearInterval(timer);
  },[active,router]);

  async function generate(){
    setPending(true);setError(null);
    try{
      const response=await fetch(
        `/api/projects/${projectId}/storyboard/generate`,
        {
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({
            expectedWizardRevision:wizardRevision,
            direction
          })
        }
      );
      const payload=(await response.json()) as {error?:string};
      if(!response.ok){
        setError(payload.error??"Storyboard generation failed.");
        return;
      }
      setDirection("");
      router.refresh();
    }catch{
      setError("Storyboard generation failed. Please try again.");
    }finally{setPending(false);}
  }

  const shotCount=storyboard.sequences.reduce(
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
              <p className="eyebrow">Automatic Storyboard Engine</p>
              <h2>Generate the complete timed storyboard.</h2>
              <p>
                The engine converts every locked sequence into continuous
                shot-by-shot visual beats and materializes them as versioned
                shots.
              </p>
            </div>
            <label>
              <span>Additional direction</span>
              <textarea
                value={direction}
                onChange={event=>setDirection(event.target.value)}
                placeholder="Optional direction for this storyboard pass."
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
                A configured text-generation provider is required.
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

          {storyboard.sequences.length?(
            <section className="storyboardPlan">
              <div className="storyboardSummary">
                <div><span>Sequences</span><strong>{storyboard.sequences.length}</strong></div>
                <div><span>Shots</span><strong>{shotCount}</strong></div>
                <div><span>Stage</span><strong>{wizardStatus.replaceAll("_"," ")}</strong></div>
              </div>

              {storyboard.sequences.map(sequence=>(
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
                    {sequence.shots.map((shot,index)=>(
                      <article
                        className="storyboardShot"
                        key={shot.shotVersionId}
                      >
                        <div className="storyboardShotTop">
                          <div>
                            <span>Shot {index+1}</span>
                            <h4>{shot.label||"Untitled shot"}</h4>
                          </div>
                          <strong>{ms(shot.startMs)}–{ms(shot.endMs)}</strong>
                        </div>
                        <p className="storyboardBeat">{shot.beat}</p>
                        <div className="storyboardShotGrid">
                          <section><strong>Purpose</strong><p>{shot.dramaticPurpose}</p></section>
                          <section><strong>Subject</strong><p>{shot.subject}</p></section>
                          <section><strong>Action</strong><p>{shot.action}</p></section>
                          <section><strong>Environment</strong><p>{shot.environment}</p></section>
                          <section><strong>Framing</strong><p>{shot.framingIntent}</p></section>
                          <section><strong>Camera</strong><p>{shot.cameraIntent}</p></section>
                          <section><strong>Continuity</strong><p>{shot.continuityNotes}</p></section>
                          <section><strong>Intensity</strong><p>{shot.visualIntensity}/100</p></section>
                        </div>
                      </article>
                    ))}
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
