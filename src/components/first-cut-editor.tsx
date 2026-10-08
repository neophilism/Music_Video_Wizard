"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";

type TimelineItemView={
  id:string;
  position:number;
  shotSpecificationVersionId:string|null;
  clipAssetVersionId:string|null;
  timelineStartMs:number;
  timelineEndMs:number;
  sourceStartMs:number;
  sourceEndMs:number|null;
  parameters:unknown;
  clipUrl:string|null;
};

type TransitionView={
  id:string;
  fromItemId:string;
  toItemId:string;
  kind:string;
  durationMs:number;
  parameters:unknown;
};

type VersionView={
  id:string;
  versionNumber:number;
  lifecycle:string;
  compiledAutomatically:boolean;
  audioMasterAssetVersionId:string;
  createdAt:string;
  lockedAt:string|null;
  items:TimelineItemView[];
  transitions:TransitionView[];
};

type StateView={
  sourceReady:boolean;
  sourceError:string|null;
  needsRebuild:boolean;
  wizardRevision:number;
  wizardStatus:string;
  wizardLocked:boolean;
  timeline:{id:string;name:string}|null;
  version:VersionView|null;
  durationMs:number|null;
};

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>
    :{};
}

function itemLabel(item:TimelineItemView){
  const params=asRecord(item.parameters);
  return typeof params.label==="string"&&params.label.trim()
    ?params.label
    :"Shot "+(item.position+1);
}

function transitionIntent(transition:TransitionView){
  const params=asRecord(transition.parameters);
  const outgoing=typeof params.outgoingIntent==="string"
    ?params.outgoingIntent.trim()
    :"";
  const incoming=typeof params.incomingIntent==="string"
    ?params.incomingIntent.trim()
    :"";
  return [outgoing,incoming].filter(Boolean).join(" / ")||"Straight cut";
}

function formatTime(ms:number){
  const safe=Math.max(0,ms);
  const minutes=Math.floor(safe/60000);
  const seconds=Math.floor((safe%60000)/1000);
  const millis=safe%1000;
  return String(minutes).padStart(2,"0")+":"+
    String(seconds).padStart(2,"0")+"."+
    String(millis).padStart(3,"0");
}

export function FirstCutEditor(props:StateView&{
  projectId:string;
  audioUrl:string|null;
}){
  const router=useRouter();
  const [state,setState]=useState<StateView>(props);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [activePosition,setActivePosition]=useState(0);
  const [playing,setPlaying]=useState(false);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const videoRef=useRef<HTMLVideoElement|null>(null);

  const items=useMemo(
    ()=>[...(state.version?.items??[])].sort(
      (a,b)=>a.position-b.position
    ),
    [state.version?.items]
  );
  const transitions=useMemo(
    ()=>state.version?.transitions??[],
    [state.version?.transitions]
  );
  const durationMs=state.durationMs??
    (items.length?items[items.length-1]!.timelineEndMs:0);
  const activeItem=items[activePosition]??null;

  const transitionByFrom=useMemo(()=>{
    const map=new Map<string,TransitionView>();
    for(const transition of transitions){
      map.set(transition.fromItemId,transition);
    }
    return map;
  },[transitions]);

  const locateItem=useCallback((timeMs:number)=>{
    if(!items.length) return 0;
    const found=items.findIndex(
      item=>timeMs>=item.timelineStartMs&&timeMs<item.timelineEndMs
    );
    return found>=0?found:items.length-1;
  },[items]);

  const syncVideo=useCallback((force=false)=>{
    const audio=audioRef.current;
    const video=videoRef.current;
    if(!audio||!video||!activeItem) return;
    const audioMs=audio.currentTime*1000;
    const desiredMs=
      activeItem.sourceStartMs+
      Math.max(0,audioMs-activeItem.timelineStartMs);
    const maxMs=activeItem.sourceEndMs??desiredMs;
    const desiredSeconds=Math.min(desiredMs,maxMs)/1000;
    if(
      force||
      !Number.isFinite(video.currentTime)||
      Math.abs(video.currentTime-desiredSeconds)>0.18
    ){
      try{
        video.currentTime=desiredSeconds;
      }catch{}
    }
  },[activeItem]);

  const syncFromAudio=useCallback(()=>{
    const audio=audioRef.current;
    if(!audio||!items.length) return;
    const next=locateItem(audio.currentTime*1000);
    if(next!==activePosition){
      setActivePosition(next);
      return;
    }
    syncVideo();
  },[items,locateItem,activePosition,syncVideo]);

  useEffect(()=>{
    syncVideo(true);
    if(playing){
      videoRef.current?.play().catch(()=>undefined);
    }
  },[activePosition,playing,syncVideo]);

  async function refresh(){
    const response=await fetch(
      `/api/projects/${props.projectId}/first-cut`,
      {cache:"no-store"}
    );
    if(!response.ok) return;
    const next=await response.json() as StateView;
    setState(next);
    setActivePosition(0);
  }

  async function build(){
    setBusy(true);
    setMessage(null);
    try{
      const response=await fetch(
        `/api/projects/${props.projectId}/first-cut/build`,
        {
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({
            expectedWizardRevision:state.wizardRevision
          })
        }
      );
      const result=await response.json() as {
        changed?:boolean;
        versionNumber?:number;
        error?:string;
      };
      if(!response.ok){
        setMessage(result.error??"Automatic First Cut could not be built.");
        return;
      }
      await refresh();
      setMessage(
        result.changed===false
          ?"The current First Cut already matches the locked sources."
          :"Automatic First Cut v"+String(result.versionNumber??"")+" compiled."
      );
      router.refresh();
    }finally{
      setBusy(false);
    }
  }

  async function lock(){
    setBusy(true);
    setMessage(null);
    try{
      const response=await fetch(
        `/api/projects/${props.projectId}/first-cut`,
        {
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({
            action:"lock",
            expectedWizardRevision:state.wizardRevision
          })
        }
      );
      const result=await response.json() as {
        versionNumber?:number;
        error?:string;
      };
      if(!response.ok){
        setMessage(result.error??"Automatic First Cut could not be locked.");
        return;
      }
      await refresh();
      setMessage(
        "Automatic First Cut v"+
        String(result.versionNumber??"")+" locked."
      );
      router.refresh();
    }finally{
      setBusy(false);
    }
  }

  function seekTo(item:TimelineItemView){
    const audio=audioRef.current;
    if(!audio) return;
    audio.currentTime=item.timelineStartMs/1000;
    setActivePosition(item.position);
    window.setTimeout(()=>syncVideo(true),0);
  }

  if(!state.sourceReady){
    return (
      <div className="creativeLanguageEmpty">
        <p className="eyebrow">Automatic First Cut</p>
        <h2>Lock Video Clips first</h2>
        <p>
          The first edit is compiled only from the complete locked clip set and
          the immutable audio master.
        </p>
        {state.sourceError?(
          <p className="formMessage">{state.sourceError}</p>
        ):null}
      </div>
    );
  }

  return (
    <div className="firstCutEditor">
      {state.needsRebuild?(
        <div className="warningBanner">
          The current First Cut does not match the locked Video Clip set. Rebuild
          it before locking or refining.
        </div>
      ):null}

      <section className="creativeLanguageSource">
        <div>
          <p className="eyebrow">Versioned editorial timeline</p>
          <h2>
            {state.version
              ?"Automatic First Cut v"+state.version.versionNumber
              :"First Cut not compiled"}
          </h2>
          <p>
            The immutable master audio drives playback. Every video segment is
            pinned to its exact generated clip and locked Shot Specification.
          </p>
        </div>
        <div className="creativeLanguageFacts">
          <span>{state.wizardLocked?"Locked":"Reviewable"}</span>
          <span>{items.length} clips</span>
          <span>{transitions.length} transitions</span>
          <span>{formatTime(durationMs)}</span>
        </div>
      </section>

      {!state.wizardLocked?(
        <section className="creativeLanguageGenerate">
          <h3>{state.version?"Rebuild Automatic First Cut":"Build Automatic First Cut"}</h3>
          <p className="dashboardNote">
            Rebuilding is deterministic. If the locked sources have not changed,
            the existing timeline version is reused.
          </p>
          <button
            className="secondaryButton"
            disabled={busy}
            onClick={build}
          >
            {state.version?"Rebuild First Cut":"Build First Cut"}
          </button>
        </section>
      ):null}

      {state.version?(
        <>
          <section className="firstCutPlayback">
            <div className="firstCutPlaybackHeader">
              <div>
                <p className="eyebrow">Synchronized review</p>
                <h3>{activeItem?itemLabel(activeItem):"First Cut"}</h3>
              </div>
              {activeItem?(
                <span>
                  {formatTime(activeItem.timelineStartMs)} –{" "}
                  {formatTime(activeItem.timelineEndMs)}
                </span>
              ):null}
            </div>

            <div className="firstCutMonitor">
              {activeItem?.clipUrl?(
                <video
                  key={activeItem.id}
                  ref={videoRef}
                  src={activeItem.clipUrl}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={()=>{
                    syncVideo(true);
                    if(playing){
                      videoRef.current?.play().catch(()=>undefined);
                    }
                  }}
                />
              ):(
                <div className="initialFramePlaceholder">
                  <span>Clip preview unavailable</span>
                </div>
              )}
            </div>

            {props.audioUrl?(
              <audio
                ref={audioRef}
                className="audioPlayer"
                controls
                preload="metadata"
                src={props.audioUrl}
                onTimeUpdate={syncFromAudio}
                onSeeked={()=>{
                  const audio=audioRef.current;
                  if(!audio) return;
                  setActivePosition(locateItem(audio.currentTime*1000));
                  window.setTimeout(()=>syncVideo(true),0);
                }}
                onPlay={()=>{
                  setPlaying(true);
                  syncFromAudio();
                  videoRef.current?.play().catch(()=>undefined);
                }}
                onPause={()=>{
                  setPlaying(false);
                  videoRef.current?.pause();
                }}
                onEnded={()=>{
                  setPlaying(false);
                  videoRef.current?.pause();
                }}
              >
                Your browser does not support audio playback.
              </audio>
            ):(
              <p className="formMessage">
                Audio preview URL is unavailable, but the timeline remains pinned
                to the immutable audio-master AssetVersion.
              </p>
            )}
            <p className="dashboardNote">
              This review switches and seeks source clips against the master audio.
              Transition effects are represented below as edit intent; they are not
              falsely simulated as a flattened render.
            </p>
          </section>

          <section className="firstCutTimelinePanel">
            <div className="firstCutRuler">
              <span>0:00</span>
              <span>{formatTime(durationMs)}</span>
            </div>
            <div className="firstCutTimeline">
              {items.map(item=>{
                const width=durationMs
                  ?((item.timelineEndMs-item.timelineStartMs)/durationMs)*100
                  :0;
                const transition=transitionByFrom.get(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={
                      "firstCutSegment "+
                      (item.position===activePosition
                        ?"firstCutSegmentActive":"")
                    }
                    style={{width:Math.max(width,0.5)+"%"}}
                    onClick={()=>seekTo(item)}
                    title={
                      itemLabel(item)+" · "+
                      formatTime(item.timelineStartMs)+" – "+
                      formatTime(item.timelineEndMs)
                    }
                  >
                    <strong>{item.position+1}</strong>
                    <span>{itemLabel(item)}</span>
                    {transition?(
                      <small>
                        {transition.kind}
                        {transition.durationMs
                          ?" · "+transition.durationMs+" ms"
                          :""}
                      </small>
                    ):null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="firstCutTransitionList">
            <div>
              <p className="eyebrow">Transition intent</p>
              <h3>Locked edit instructions between shots</h3>
            </div>
            {transitions.map((transition,index)=>(
              <article key={transition.id}>
                <strong>
                  {index+1} → {index+2} · {transition.kind}
                </strong>
                <span>
                  {transition.durationMs
                    ?transition.durationMs+" ms explicit duration"
                    :"Duration unspecified"}
                </span>
                <p>{transitionIntent(transition)}</p>
              </article>
            ))}
          </section>
        </>
      ):null}

      {message?<p className="formMessage">{message}</p>:null}

      {!state.wizardLocked&&state.version&&!state.needsRebuild?(
        <div className="creativeLanguageActions">
          <button
            className="primaryButton"
            disabled={busy}
            onClick={lock}
          >
            Lock Automatic First Cut
          </button>
        </div>
      ):null}
    </div>
  );
}
