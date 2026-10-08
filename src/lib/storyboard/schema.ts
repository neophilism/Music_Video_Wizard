import { z } from "zod";

const text=(max:number)=>z.string().trim().max(max);
const req=(max:number)=>z.string().trim().min(1).max(max);

export const storyboardShotSchema=z.object({
  label:req(180),
  startMs:z.number().int().min(0),
  endMs:z.number().int().min(0),
  dramaticPurpose:req(4000),
  beat:req(4000),
  subject:req(3000),
  action:req(4000),
  environment:req(4000),
  framingIntent:req(3000),
  cameraIntent:req(3000),
  continuityNotes:text(3000),
  transitionIn:text(2200),
  transitionOut:text(2200),
  visualIntensity:z.number().int().min(0).max(100)
}).strict().refine(v=>v.endMs>v.startMs,{
  message:"Storyboard shot duration must be positive."
});

export const storyboardSequenceSchema=z.object({
  sequenceVersionId:z.string().uuid(),
  shots:z.array(storyboardShotSchema).min(1).max(200)
}).strict();

export const storyboardDocumentSchema=z.object({
  sequences:z.array(storyboardSequenceSchema).min(1).max(64)
}).strict();

export type StoryboardShot=z.infer<typeof storyboardShotSchema>;
export type StoryboardDocument=z.infer<typeof storyboardDocumentSchema>;

export const storyboardShotSpecSchema=z.object({
  schemaVersion:z.literal(1),
  stage:z.literal("STORYBOARD"),
  sourceSequenceVersionId:z.string().uuid(),
  sourceSequenceNodeId:z.string().uuid(),
  sourceSequencePosition:z.number().int().min(0),
  sourceShotPosition:z.number().int().min(0),
  beat:req(4000),
  environment:req(4000),
  framingIntent:req(3000),
  cameraIntent:req(3000),
  visualIntensity:z.number().int().min(0).max(100),
  generationJobId:z.string().uuid()
}).strict();

export type StoryboardShotSpec=z.infer<typeof storyboardShotSpecSchema>;

export interface StoryboardSequenceConstraint{
  sequenceVersionId:string;
  startMs:number;
  endMs:number;
  targetShotCount:number|null;
}

export function storyboardCompletionIssues(
  document:StoryboardDocument,
  constraints:readonly StoryboardSequenceConstraint[]
):string[]{
  const expected=new Map(constraints.map(item=>[item.sequenceVersionId,item]));
  if(document.sequences.length!==constraints.length){
    return ["Storyboard must include every locked Sequence Map sequence exactly once."];
  }
  const seen=new Set<string>();
  for(const sequence of document.sequences){
    if(seen.has(sequence.sequenceVersionId)){
      return ["Storyboard includes a sequence more than once."];
    }
    seen.add(sequence.sequenceVersionId);
    const constraint=expected.get(sequence.sequenceVersionId);
    if(!constraint){
      return ["Storyboard references a sequence that is not active in the locked Sequence Map."];
    }
    const shots=[...sequence.shots].sort((a,b)=>a.startMs-b.startMs);
    if(shots[0]!.startMs!==constraint.startMs){
      return ["Each storyboard sequence must begin exactly at its Sequence Map start time."];
    }
    for(let index=0;index<shots.length;index++){
      const shot=shots[index]!;
      if(shot.startMs<constraint.startMs||shot.endMs>constraint.endMs){
        return ["Storyboard shots must stay inside their source sequence timing."];
      }
      if(index>0&&shot.startMs!==shots[index-1]!.endMs){
        return ["Storyboard shots must cover each sequence continuously without gaps or overlaps."];
      }
    }
    if(shots.at(-1)!.endMs!==constraint.endMs){
      return ["Each storyboard sequence must end exactly at its Sequence Map end time."];
    }
    if(
      constraint.targetShotCount!==null &&
      shots.length!==constraint.targetShotCount
    ){
      return ["Storyboard must honor an explicit target shot count from the Sequence Map."];
    }
  }
  return [];
}

const shotJson={
  type:"object",
  properties:{
    label:{type:"string"},
    startMs:{type:"integer"},
    endMs:{type:"integer"},
    dramaticPurpose:{type:"string"},
    beat:{type:"string"},
    subject:{type:"string"},
    action:{type:"string"},
    environment:{type:"string"},
    framingIntent:{type:"string"},
    cameraIntent:{type:"string"},
    continuityNotes:{type:"string"},
    transitionIn:{type:"string"},
    transitionOut:{type:"string"},
    visualIntensity:{type:"integer"}
  },
  required:[
    "label","startMs","endMs","dramaticPurpose","beat","subject","action",
    "environment","framingIntent","cameraIntent","continuityNotes",
    "transitionIn","transitionOut","visualIntensity"
  ],
  additionalProperties:false
} as const;

export const storyboardJsonSchema={
  type:"object",
  properties:{
    sequences:{
      type:"array",
      minItems:1,
      maxItems:64,
      items:{
        type:"object",
        properties:{
          sequenceVersionId:{type:"string"},
          shots:{type:"array",minItems:1,maxItems:200,items:shotJson}
        },
        required:["sequenceVersionId","shots"],
        additionalProperties:false
      }
    }
  },
  required:["sequences"],
  additionalProperties:false
} as const;
