export interface FirstCutSource{
  sequencePosition:number;
  shotPosition:number;
  label:string|null;
  shotSpecificationVersionId:string;
  shotSpecificationNodeId:string;
  clipAssetVersionId:string;
  clipNodeId:string;
  timelineStartMs:number;
  timelineEndMs:number;
  generatedDurationMs:number|null;
  transitionIn:string;
  transitionOut:string;
}

export interface FirstCutItemPlan extends FirstCutSource{
  position:number;
  sourceStartMs:number;
  sourceEndMs:number;
}

export interface FirstCutTransitionPlan{
  fromPosition:number;
  toPosition:number;
  kind:string;
  durationMs:number;
  outgoingIntent:string;
  incomingIntent:string;
  durationSpecified:boolean;
}

export interface FirstCutPlan{
  items:FirstCutItemPlan[];
  transitions:FirstCutTransitionPlan[];
  durationMs:number;
}

function explicitDurationMs(value:string){
  const match=value.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec|secs|seconds?)\b/i
  );
  if(!match) return null;
  const amount=Number(match[1]);
  if(!Number.isFinite(amount)||amount<0) return null;
  return Math.round(
    /^(?:ms|millisecond)/i.test(match[2])
      ?amount
      :amount*1000
  );
}

function transitionKind(value:string){
  const text=value.toLowerCase();
  if(/match\s+cut/.test(text)) return "MATCH_CUT";
  if(/jump\s+cut/.test(text)) return "JUMP_CUT";
  if(/smash\s+cut/.test(text)) return "SMASH_CUT";
  if(/hard\s+cut|straight\s+cut|\bcut\b/.test(text)) return "CUT";
  if(/cross[ -]?dissolve|dissolve/.test(text)) return "DISSOLVE";
  if(/fade/.test(text)) return "FADE";
  if(/wipe/.test(text)) return "WIPE";
  if(/whip/.test(text)) return "WHIP";
  if(/morph/.test(text)) return "MORPH";
  return value.trim()?"DESCRIBED":"CUT";
}

export function compileFirstCutPlan(
  input:readonly FirstCutSource[]
):FirstCutPlan{
  if(!input.length) throw new Error("Automatic First Cut has no clips.");

  const sorted=[...input].sort(
    (a,b)=>a.timelineStartMs-b.timelineStartMs||
      a.sequencePosition-b.sequencePosition||
      a.shotPosition-b.shotPosition
  );

  if(sorted[0]!.timelineStartMs!==0){
    throw new Error("Automatic First Cut must begin at 0 ms.");
  }

  let previousEnd=0;
  const items=sorted.map((source,position)=>{
    if(
      !Number.isInteger(source.timelineStartMs)||
      !Number.isInteger(source.timelineEndMs)||
      source.timelineStartMs<0||
      source.timelineEndMs<=source.timelineStartMs
    ){
      throw new Error("Every First Cut source requires valid millisecond timing.");
    }
    if(source.timelineStartMs!==previousEnd){
      throw new Error(
        "Automatic First Cut sources must cover the song continuously without gaps or overlaps."
      );
    }
    const editorialDuration=source.timelineEndMs-source.timelineStartMs;
    if(
      source.generatedDurationMs!==null&&
      source.generatedDurationMs<editorialDuration
    ){
      throw new Error(
        "A generated Video Clip is shorter than its locked editorial duration."
      );
    }
    previousEnd=source.timelineEndMs;
    return {
      ...source,
      position,
      sourceStartMs:0,
      sourceEndMs:editorialDuration
    };
  });

  const transitions:FirstCutTransitionPlan[]=[];
  for(let position=0;position<items.length-1;position++){
    const outgoing=items[position]!;
    const incoming=items[position+1]!;
    const outgoingIntent=outgoing.transitionOut.trim();
    const incomingIntent=incoming.transitionIn.trim();
    const combined=[outgoingIntent,incomingIntent].filter(Boolean).join(" / ");
    const explicit=[
      explicitDurationMs(outgoingIntent),
      explicitDurationMs(incomingIntent)
    ].find((value):value is number=>value!==null);
    const maxDuration=Math.min(
      outgoing.timelineEndMs-outgoing.timelineStartMs,
      incoming.timelineEndMs-incoming.timelineStartMs
    );
    transitions.push({
      fromPosition:position,
      toPosition:position+1,
      kind:transitionKind(combined),
      durationMs:Math.min(explicit??0,maxDuration),
      outgoingIntent,
      incomingIntent,
      durationSpecified:explicit!==undefined
    });
  }

  return {
    items,
    transitions,
    durationMs:items[items.length-1]!.timelineEndMs
  };
}
