import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const req = (max: number) => z.string().trim().min(1).max(max);

function passageSchema(required: boolean) {
  const p = required ? req(5000) : text(5000);
  return z.object({
    title: required ? req(180) : text(180),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    treatmentSectionIndexes: z.array(z.number().int().min(0)).max(12),
    musicAnchorIds: z.array(z.string().uuid()).max(16),
    dramaticPurpose: p,
    pictureState: p,
    narrativeState: p,
    characterState: p,
    performanceMode: p,
    worldState: p,
    motifState: p,
    creativeLanguageApplication: p,
    cameraAndMotionIntent: p,
    editingRhythm: p,
    transitionIn: text(2200),
    transitionOut: text(2200),
    visualIntensity: z.number().int().min(0).max(100)
  }).refine((v)=>v.endMs>=v.startMs,{message:"Passage end must not precede its start."});
}

function planSchema(required: boolean) {
  const p = required ? req(6000) : text(6000);
  return z.object({
    title: required ? req(220) : text(220),
    governingStrategy: p,
    visualEscalation: p,
    narrativeDistribution: p,
    performanceDistribution: p,
    transitionStrategy: p,
    endingStrategy: p,
    passages: z.array(passageSchema(required)).max(64)
  });
}

export const songPicturePlanDraftSchema = planSchema(false);
export const songPicturePlanDocumentSchema = planSchema(true).superRefine((v,ctx)=>{
  if (v.passages.length < 2) ctx.addIssue({code:"custom",path:["passages"],message:"Add at least two visual passages."});
});

export type SongPicturePlanDraft = z.infer<typeof songPicturePlanDraftSchema>;
export type SongPicturePlanDocument = z.infer<typeof songPicturePlanDocumentSchema>;

export const EMPTY_SONG_PICTURE_PLAN: SongPicturePlanDraft = {
  title:"",
  governingStrategy:"",
  visualEscalation:"",
  narrativeDistribution:"",
  performanceDistribution:"",
  transitionStrategy:"",
  endingStrategy:"",
  passages:[]
};

export function songPicturePlanCompletionIssues(
  draft: SongPicturePlanDraft,
  input: {durationMs:number;treatmentSectionCount:number;acceptedAnchorIds:Set<string>}
): string[] {
  const parsed=songPicturePlanDocumentSchema.safeParse(draft);
  if(!parsed.success) return parsed.error.issues.map(i=>i.message);
  const passages=parsed.data.passages;
  if(passages[0]!.startMs!==0) return ["The plan must begin at the start of the song."];
  for(let i=0;i<passages.length;i++){
    const p=passages[i]!;
    if(p.treatmentSectionIndexes.length===0) return ["Every passage must reference at least one Treatment section."];
    if(p.treatmentSectionIndexes.some(x=>x>=input.treatmentSectionCount)) return ["A passage references a Treatment section that does not exist."];
    if(p.musicAnchorIds.some(id=>!input.acceptedAnchorIds.has(id))) return ["A passage references a Music Map anchor that is not accepted in the pinned map."];
    if(i>0 && p.startMs!==passages[i-1]!.endMs) return ["Visual passages must cover the song continuously without gaps or overlaps."];
  }
  if(passages.at(-1)!.endMs!==input.durationMs) return ["The plan must end exactly at the end of the finished song."];
  return [];
}

const passageJson={
  type:"object",
  properties:{
    title:{type:"string"},startMs:{type:"integer"},endMs:{type:"integer"},
    treatmentSectionIndexes:{type:"array",items:{type:"integer"}},
    musicAnchorIds:{type:"array",items:{type:"string"}},
    dramaticPurpose:{type:"string"},pictureState:{type:"string"},narrativeState:{type:"string"},
    characterState:{type:"string"},performanceMode:{type:"string"},worldState:{type:"string"},
    motifState:{type:"string"},creativeLanguageApplication:{type:"string"},
    cameraAndMotionIntent:{type:"string"},editingRhythm:{type:"string"},
    transitionIn:{type:"string"},transitionOut:{type:"string"},visualIntensity:{type:"integer"}
  },
  required:["title","startMs","endMs","treatmentSectionIndexes","musicAnchorIds","dramaticPurpose","pictureState","narrativeState","characterState","performanceMode","worldState","motifState","creativeLanguageApplication","cameraAndMotionIntent","editingRhythm","transitionIn","transitionOut","visualIntensity"],
  additionalProperties:false
} as const;

export const songPicturePlanJsonSchema={
  type:"object",
  properties:{
    title:{type:"string"},governingStrategy:{type:"string"},visualEscalation:{type:"string"},
    narrativeDistribution:{type:"string"},performanceDistribution:{type:"string"},
    transitionStrategy:{type:"string"},endingStrategy:{type:"string"},
    passages:{type:"array",minItems:2,maxItems:64,items:passageJson}
  },
  required:["title","governingStrategy","visualEscalation","narrativeDistribution","performanceDistribution","transitionStrategy","endingStrategy","passages"],
  additionalProperties:false
} as const;
