import { describe, expect, it } from "vitest";
import {
  storyboardCompletionIssues,
  storyboardDocumentSchema
} from "./schema";

const shot=(label:string,startMs:number,endMs:number)=>({
  label,
  startMs,
  endMs,
  dramaticPurpose:"Advance the sequence.",
  beat:"A clear visual beat.",
  subject:"Performer",
  action:"Moves through frame.",
  environment:"Night street.",
  framingIntent:"Medium-wide with strong depth.",
  cameraIntent:"Restrained lateral move.",
  continuityNotes:"Maintain direction of travel.",
  transitionIn:"",
  transitionOut:"",
  visualIntensity:50
});

describe("storyboard schema",()=>{
  it("accepts continuous full-sequence storyboard coverage",()=>{
    const document=storyboardDocumentSchema.parse({
      sequences:[{
        sequenceVersionId:"11111111-1111-4111-8111-111111111111",
        shots:[shot("A",0,1000),shot("B",1000,2000)]
      }]
    });
    expect(storyboardCompletionIssues(document,[{
      sequenceVersionId:"11111111-1111-4111-8111-111111111111",
      startMs:0,
      endMs:2000,
      targetShotCount:2
    }])).toEqual([]);
  });

  it("rejects gaps between storyboard shots",()=>{
    const document=storyboardDocumentSchema.parse({
      sequences:[{
        sequenceVersionId:"11111111-1111-4111-8111-111111111111",
        shots:[shot("A",0,900),shot("B",1000,2000)]
      }]
    });
    expect(storyboardCompletionIssues(document,[{
      sequenceVersionId:"11111111-1111-4111-8111-111111111111",
      startMs:0,
      endMs:2000,
      targetShotCount:null
    }])).toContain(
      "Storyboard shots must cover each sequence continuously without gaps or overlaps."
    );
  });
});
