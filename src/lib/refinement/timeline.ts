export interface WorkingItemSnapshot{
  position:number;
  shotVersionId:string;
  assetVersionId:string;
  assetNodeId:string;
  timelineStartMs:number;
  timelineEndMs:number;
  sourceStartMs:number;
  sourceEndMs:number;
  manualOverride:boolean;
  parameters:unknown;
  availableDurationMs:number|null;
}

export interface WorkingTransitionSnapshot{
  fromPosition:number;
  toPosition:number;
  kind:string;
  durationMs:number;
  parameters:unknown;
}

export interface WorkingTimelineSnapshot{
  items:WorkingItemSnapshot[];
  transitions:WorkingTransitionSnapshot[];
}

export function validateWorkingTimeline(
  snapshot:WorkingTimelineSnapshot
):void{
  if(!snapshot.items.length){
    throw new Error("Refinement timeline has no video items.");
  }
  const items=[...snapshot.items].sort((a,b)=>a.position-b.position);
  if(items[0]!.timelineStartMs!==0){
    throw new Error("Refinement timeline must begin at 0 ms.");
  }

  let previousEnd=0;
  for(let index=0;index<items.length;index++){
    const item=items[index]!;
    if(item.position!==index){
      throw new Error("Refinement timeline positions must be contiguous.");
    }
    if(
      item.timelineStartMs!==previousEnd||
      item.timelineEndMs<=item.timelineStartMs
    ){
      throw new Error(
        "Refinement timeline must remain continuous without gaps or overlaps."
      );
    }
    const editorial=item.timelineEndMs-item.timelineStartMs;
    if(
      item.sourceStartMs<0||
      item.sourceEndMs<=item.sourceStartMs||
      item.sourceEndMs-item.sourceStartMs!==editorial
    ){
      throw new Error(
        "Refinement source ranges must exactly match timeline durations."
      );
    }
    if(
      item.availableDurationMs!==null&&
      item.sourceEndMs>item.availableDurationMs
    ){
      throw new Error(
        "A refinement edit requires more source duration than the selected clip contains."
      );
    }
    previousEnd=item.timelineEndMs;
  }

  for(const transition of snapshot.transitions){
    if(
      transition.toPosition!==transition.fromPosition+1||
      transition.fromPosition<0||
      transition.toPosition>=items.length
    ){
      throw new Error("Refinement transitions must connect adjacent items.");
    }
    const outgoing=items[transition.fromPosition]!;
    const incoming=items[transition.toPosition]!;
    const maxDuration=Math.min(
      outgoing.timelineEndMs-outgoing.timelineStartMs,
      incoming.timelineEndMs-incoming.timelineStartMs
    );
    if(
      transition.durationMs<0||
      transition.durationMs>maxDuration
    ){
      throw new Error(
        "Transition duration cannot exceed either adjacent timeline item."
      );
    }
    if(
      transition.durationMs>0&&
      outgoing.availableDurationMs!==null&&
      outgoing.sourceEndMs+transition.durationMs>
        outgoing.availableDurationMs
    ){
      throw new Error(
        "Transition duration requires more outgoing clip tail than the selected clip contains."
      );
    }
  }
}

export function retimeBoundary(
  snapshot:WorkingTimelineSnapshot,
  boundaryPosition:number,
  timelineMs:number
):WorkingTimelineSnapshot{
  const items=snapshot.items.map(item=>({...item}));
  const outgoing=items[boundaryPosition];
  const incoming=items[boundaryPosition+1];
  if(!outgoing||!incoming){
    throw new Error("Selected refinement boundary does not exist.");
  }
  if(
    timelineMs<=outgoing.timelineStartMs||
    timelineMs>=incoming.timelineEndMs
  ){
    throw new Error(
      "A cut boundary must remain inside the combined adjacent shot range."
    );
  }

  outgoing.timelineEndMs=timelineMs;
  outgoing.sourceEndMs=
    outgoing.sourceStartMs+
    (outgoing.timelineEndMs-outgoing.timelineStartMs);
  outgoing.manualOverride=true;

  incoming.timelineStartMs=timelineMs;
  incoming.sourceEndMs=
    incoming.sourceStartMs+
    (incoming.timelineEndMs-incoming.timelineStartMs);
  incoming.manualOverride=true;

  const result={
    items,
    transitions:snapshot.transitions.map(item=>({...item}))
  };
  validateWorkingTimeline(result);
  return result;
}

export function replaceClip(
  snapshot:WorkingTimelineSnapshot,
  position:number,
  replacement:{
    assetVersionId:string;
    assetNodeId:string;
    availableDurationMs:number|null;
  }
):WorkingTimelineSnapshot{
  const items=snapshot.items.map(item=>({...item}));
  const item=items[position];
  if(!item) throw new Error("Selected refinement item does not exist.");
  item.assetVersionId=replacement.assetVersionId;
  item.assetNodeId=replacement.assetNodeId;
  item.availableDurationMs=replacement.availableDurationMs;
  item.manualOverride=true;

  const result={
    items,
    transitions:snapshot.transitions.map(item=>({...item}))
  };
  validateWorkingTimeline(result);
  return result;
}

export function updateTransition(
  snapshot:WorkingTimelineSnapshot,
  input:{
    fromPosition:number;
    kind:string;
    durationMs:number;
    note:string;
  }
):WorkingTimelineSnapshot{
  if(
    input.fromPosition<0||
    input.fromPosition>=snapshot.items.length-1
  ){
    throw new Error("Selected refinement transition does not exist.");
  }

  const transitions=snapshot.transitions
    .filter(item=>item.fromPosition!==input.fromPosition)
    .map(item=>({...item}));
  transitions.push({
    fromPosition:input.fromPosition,
    toPosition:input.fromPosition+1,
    kind:input.kind.trim().toUpperCase().replace(/\s+/g,"_"),
    durationMs:input.durationMs,
    parameters:{
      origin:"MANUAL",
      note:input.note
    }
  });
  transitions.sort((a,b)=>a.fromPosition-b.fromPosition);

  const result={
    items:snapshot.items.map(item=>({...item})),
    transitions
  };
  validateWorkingTimeline(result);
  return result;
}
