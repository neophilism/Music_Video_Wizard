"use client";

import { useState } from "react";

type Status="NOT_STARTED"|"IN_PROGRESS"|"COMPLETED"|"NEEDS_REVIEW";

interface SequenceView {
  position:number;
  sequenceId:string;
  sequenceVersionId:string;
  nodeId:string;
  versionNumber:number;
  lifecycle:string;
  title:string;
  summary:string|null;
  purpose:string|null;
  startMs:number|null;
  endMs:number|null;
  sourcePassageIndex:number;
  sourcePassageTitle:string;
  sourceSongPicturePlanVersionId:string;
  sourceSongPicturePlanNodeId:string;
  targetShotCount:number|null;
  planningNotes:string;
  sourceContext:{
    dramaticPurpose:string;
    pictureState:string;
    narrativeState:string;
    characterState:string;
    performanceMode:string;
    worldState:string;
    motifState:string;
    creativeLanguageApplication:string;
    cameraAndMotionIntent:string;
    editingRhythm:string;
    transitionIn:string;
    transitionOut:string;
    visualIntensity:number;
  };
}

interface Props {
  projectId:string;
  sourceReady:boolean;
  needsRebase:boolean;
  latestSongPicturePlanVersionNumber:number|null;
  initialMap:{
    sourceSongPicturePlanVersionId:string|null;
    sourceSongPicturePlanNodeId:string|null;
    sequences:SequenceView[];
  };
  wizardRevision:number;
  wizardStatus:Status;
  wizardLocked:boolean;
}

export function SequenceMapEditor({
  projectId,
  sourceReady,
  needsRebase,
  latestSongPicturePlanVersionNumber,
  initialMap,
  wizardRevision,
  wizardStatus,
  wizardLocked
}:Props){
  const [sequences,setSequences]=useState(initialMap.sequences);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);

  function patch(index:number,values:Partial<SequenceView>){
    setSequences(current=>current.map((item,i)=>i===index?{...item,...values}:item));
  }

  async function action(body:Record<string,unknown>){
    setPending(true);setError(null);
    try{
      const response=await fetch(`/api/projects/${projectId}/sequence-map`,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(body)
      });
      const payload=(await response.json()) as {error?:string};
      if(!response.ok){
        setError(payload.error??"Sequence Map request failed.");
        return;
      }
      window.location.reload();
    }catch{
      setError("Sequence Map request failed. Please try again.");
    }finally{setPending(false);}
  }

  const locked=wizardLocked||sequences.some(sequence=>sequence.lifecycle==="LOCKED");
  const canSave=sequences.length>0&&!locked&&wizardStatus!=="COMPLETED";
  const canComplete=sequences.length>0&&!locked&&wizardStatus!=="COMPLETED";
  const canReopen=!locked&&wizardStatus==="COMPLETED";
  const canLock=!locked&&wizardStatus==="COMPLETED";

  return (
    <div className="sequenceMapEditor">
      {!sourceReady?(
        <section className="sequenceMapEmpty">
          <h2>Lock the Song-to-Picture Plan first.</h2>
          <p>
            The Sequence Map materializes the approved continuous visual plan
            into concrete, versioned sequences.
          </p>
        </section>
      ):(
        <>
          <section className="sequenceMapSource">
            <div>
              <p className="eyebrow">Source</p>
              <h2>Locked Song-to-Picture Plan</h2>
              <p>
                Latest locked source version:{" "}
                {latestSongPicturePlanVersionNumber??"—"}.
                Each passage becomes an exact SequenceVersion with pinned
                provenance.
              </p>
            </div>
            <button
              className={initialMap.sequences.length?"secondaryButton":"primaryButton"}
              type="button"
              disabled={pending||locked}
              onClick={()=>action({action:"initialize"})}
            >
              {pending?"Working…":needsRebase?"Re-materialize from latest plan":initialMap.sequences.length?"Re-materialize":"Materialize sequences"}
            </button>
          </section>

          {needsRebase?(
            <section className="sequenceMapWarning">
              <strong>Source changed.</strong>
              <span>
                The active Sequence Map points to an older Song-to-Picture Plan.
                Re-materialize to create new sequence versions from the latest
                locked source.
              </span>
            </section>
          ):null}

          {sequences.length?(
            <section className="sequenceMapList">
              <div className="sequenceMapSummary">
                <div><span>Sequences</span><strong>{sequences.length}</strong></div>
                <div><span>Stage</span><strong>{wizardStatus.replaceAll("_"," ")}</strong></div>
                <div><span>Source</span><strong>Plan v{latestSongPicturePlanVersionNumber??"—"}</strong></div>
              </div>

              {sequences.map((sequence,index)=>(
                <article className="sequenceMapCard" key={sequence.sequenceVersionId}>
                  <div className="sequenceMapCardHeader">
                    <div>
                      <p className="eyebrow">Sequence {index+1} · v{sequence.versionNumber}</p>
                      <h3>{sequence.title||sequence.sourcePassageTitle}</h3>
                    </div>
                    <span>{sequence.lifecycle}</span>
                  </div>

                  <div className="sequenceMapTiming">
                    <label>
                      <span>Title</span>
                      <input
                        value={sequence.title}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{title:e.target.value})}
                      />
                    </label>
                    <label>
                      <span>Start ms</span>
                      <input
                        type="number"
                        min={0}
                        value={sequence.startMs??0}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{startMs:Number(e.target.value)})}
                      />
                    </label>
                    <label>
                      <span>End ms</span>
                      <input
                        type="number"
                        min={0}
                        value={sequence.endMs??0}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{endMs:Number(e.target.value)})}
                      />
                    </label>
                    <label>
                      <span>Target shots</span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={sequence.targetShotCount??""}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{
                          targetShotCount:e.target.value?Number(e.target.value):null
                        })}
                      />
                    </label>
                  </div>

                  <div className="sequenceMapGrid">
                    <label>
                      <span>Summary</span>
                      <textarea
                        value={sequence.summary??""}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{summary:e.target.value})}
                      />
                    </label>
                    <label>
                      <span>Dramatic purpose</span>
                      <textarea
                        value={sequence.purpose??""}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{purpose:e.target.value})}
                      />
                    </label>
                    <label className="sequenceMapWide">
                      <span>Planning notes</span>
                      <textarea
                        value={sequence.planningNotes}
                        disabled={locked||wizardStatus==="COMPLETED"}
                        onChange={e=>patch(index,{planningNotes:e.target.value})}
                      />
                    </label>
                  </div>

                  <details className="sequenceMapSourceContext">
                    <summary>Pinned Song-to-Picture context</summary>
                    <div className="sequenceMapContextGrid">
                      <section><strong>Picture</strong><p>{sequence.sourceContext.pictureState}</p></section>
                      <section><strong>Narrative</strong><p>{sequence.sourceContext.narrativeState}</p></section>
                      <section><strong>Character</strong><p>{sequence.sourceContext.characterState}</p></section>
                      <section><strong>Performance</strong><p>{sequence.sourceContext.performanceMode}</p></section>
                      <section><strong>World</strong><p>{sequence.sourceContext.worldState}</p></section>
                      <section><strong>Motif</strong><p>{sequence.sourceContext.motifState}</p></section>
                      <section><strong>Camera / motion</strong><p>{sequence.sourceContext.cameraAndMotionIntent}</p></section>
                      <section><strong>Editing</strong><p>{sequence.sourceContext.editingRhythm}</p></section>
                      <section><strong>Visual intensity</strong><p>{sequence.sourceContext.visualIntensity}/100</p></section>
                    </div>
                  </details>
                </article>
              ))}
            </section>
          ):null}

          {error?<p className="formError" role="alert">{error}</p>:null}

          {sequences.length?(
            <div className="sequenceMapActions">
              <button
                className="secondaryButton"
                type="button"
                disabled={pending||!canSave}
                onClick={()=>action({
                  action:"save",
                  expectedWizardRevision:wizardRevision,
                  sequences:sequences.map(sequence=>({
                    sequenceVersionId:sequence.sequenceVersionId,
                    title:sequence.title,
                    summary:sequence.summary??"",
                    purpose:sequence.purpose??"",
                    startMs:sequence.startMs??0,
                    endMs:sequence.endMs??0,
                    targetShotCount:sequence.targetShotCount,
                    planningNotes:sequence.planningNotes
                  }))
                })}
              >
                Save Sequence Map
              </button>
              {canReopen?(
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={pending}
                  onClick={()=>action({
                    action:"reopen",
                    expectedWizardRevision:wizardRevision
                  })}
                >
                  Reopen
                </button>
              ):null}
              {canComplete?(
                <button
                  className="primaryButton"
                  type="button"
                  disabled={pending}
                  onClick={()=>action({
                    action:"complete",
                    expectedWizardRevision:wizardRevision
                  })}
                >
                  Complete Sequence Map
                </button>
              ):null}
              {canLock?(
                <button
                  className="primaryButton"
                  type="button"
                  disabled={pending}
                  onClick={()=>action({
                    action:"lock",
                    expectedWizardRevision:wizardRevision
                  })}
                >
                  Lock Sequence Map
                </button>
              ):null}
            </div>
          ):null}
        </>
      )}
    </div>
  );
}
