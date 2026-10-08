import { describe, expect, it } from "vitest";
import {
  sequenceMapCompletionIssues,
  sequenceSourceSpecSchema,
  sequenceSpecFromPassage
} from "./schema";

const passage={
  title:"Opening pressure",
  startMs:0,
  endMs:12000,
  treatmentSectionIndexes:[0],
  musicAnchorIds:[],
  dramaticPurpose:"Establish the emotional problem.",
  pictureState:"Sparse nocturnal street imagery.",
  narrativeState:"The protagonist is isolated.",
  characterState:"Guarded.",
  performanceMode:"Interior performance.",
  worldState:"Empty and cool.",
  motifState:"Amber light is barely present.",
  creativeLanguageApplication:"Restrained and tactile.",
  cameraAndMotionIntent:"Mostly static.",
  editingRhythm:"Long holds.",
  transitionIn:"",
  transitionOut:"Cut on the next phrase.",
  visualIntensity:25
};

describe("sequence map schema",()=>{
  it("materializes exact Song-to-Picture passage provenance",()=>{
    const spec=sequenceSpecFromPassage({
      sourceSongPicturePlanVersionId:"11111111-1111-4111-8111-111111111111",
      sourceSongPicturePlanNodeId:"22222222-2222-4222-8222-222222222222",
      passageIndex:0,
      passage
    });
    expect(sequenceSourceSpecSchema.parse(spec).sourcePassageTitle).toBe("Opening pressure");
    expect(spec.visualIntensity).toBe(25);
  });

  it("requires continuous full-song coverage",()=>{
    expect(sequenceMapCompletionIssues([
      {sequenceVersionId:"11111111-1111-4111-8111-111111111111",title:"A",summary:"",purpose:"a",startMs:0,endMs:1000,targetShotCount:null,planningNotes:""},
      {sequenceVersionId:"22222222-2222-4222-8222-222222222222",title:"B",summary:"",purpose:"b",startMs:1100,endMs:2000,targetShotCount:null,planningNotes:""}
    ],2000)).toContain("Sequences must cover the song continuously without gaps or overlaps.");
  });
});
