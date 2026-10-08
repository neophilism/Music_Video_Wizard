import { z } from "zod";
import type { SongPicturePlanDocument } from "@/lib/song-picture-plan/schema";

const text = (max:number)=>z.string().trim().max(max);
const req = (max:number)=>z.string().trim().min(1).max(max);

export const sequenceSourceSpecSchema = z.object({
  schemaVersion: z.literal(1),
  sourceSongPicturePlanVersionId: z.string().uuid(),
  sourceSongPicturePlanNodeId: z.string().uuid(),
  sourcePassageIndex: z.number().int().min(0),
  sourcePassageTitle: req(180),
  dramaticPurpose: req(5000),
  pictureState: req(5000),
  narrativeState: req(5000),
  characterState: req(5000),
  performanceMode: req(5000),
  worldState: req(5000),
  motifState: req(5000),
  creativeLanguageApplication: req(5000),
  cameraAndMotionIntent: req(5000),
  editingRhythm: req(5000),
  transitionIn: text(2200),
  transitionOut: text(2200),
  visualIntensity: z.number().int().min(0).max(100),
  targetShotCount: z.number().int().min(1).max(200).nullable(),
  planningNotes: text(5000)
}).strict();

export type SequenceSourceSpec = z.infer<typeof sequenceSourceSpecSchema>;

export const sequenceMapEditSchema = z.object({
  sequenceVersionId: z.string().uuid(),
  title: req(180),
  summary: text(5000),
  purpose: req(5000),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  targetShotCount: z.number().int().min(1).max(200).nullable(),
  planningNotes: text(5000)
}).strict().refine(v=>v.endMs>=v.startMs,{
  message:"Sequence end must not precede its start."
});

export type SequenceMapEdit = z.infer<typeof sequenceMapEditSchema>;

export function sequenceSpecFromPassage(input:{
  sourceSongPicturePlanVersionId:string;
  sourceSongPicturePlanNodeId:string;
  passageIndex:number;
  passage:SongPicturePlanDocument["passages"][number];
}):SequenceSourceSpec{
  const p=input.passage;
  return {
    schemaVersion:1,
    sourceSongPicturePlanVersionId:input.sourceSongPicturePlanVersionId,
    sourceSongPicturePlanNodeId:input.sourceSongPicturePlanNodeId,
    sourcePassageIndex:input.passageIndex,
    sourcePassageTitle:p.title,
    dramaticPurpose:p.dramaticPurpose,
    pictureState:p.pictureState,
    narrativeState:p.narrativeState,
    characterState:p.characterState,
    performanceMode:p.performanceMode,
    worldState:p.worldState,
    motifState:p.motifState,
    creativeLanguageApplication:p.creativeLanguageApplication,
    cameraAndMotionIntent:p.cameraAndMotionIntent,
    editingRhythm:p.editingRhythm,
    transitionIn:p.transitionIn,
    transitionOut:p.transitionOut,
    visualIntensity:p.visualIntensity,
    targetShotCount:null,
    planningNotes:""
  };
}

export function sequenceMapCompletionIssues(
  entries: readonly SequenceMapEdit[],
  durationMs:number
):string[]{
  if(entries.length===0) return ["Add at least one sequence."];
  const ordered=[...entries].sort((a,b)=>a.startMs-b.startMs);
  if(ordered[0]!.startMs!==0) return ["The Sequence Map must begin at the start of the song."];
  for(let i=0;i<ordered.length;i++){
    const entry=ordered[i]!;
    if(entry.endMs<=entry.startMs) return ["Every sequence must have positive duration."];
    if(i>0 && entry.startMs!==ordered[i-1]!.endMs){
      return ["Sequences must cover the song continuously without gaps or overlaps."];
    }
  }
  if(ordered.at(-1)!.endMs!==durationMs){
    return ["The Sequence Map must end exactly at the end of the finished song."];
  }
  return [];
}
