import { describe, expect, it } from "vitest";
import {
  EMPTY_SONG_PICTURE_PLAN,
  songPicturePlanCompletionIssues,
  songPicturePlanDocumentSchema,
  songPicturePlanDraftSchema
} from "./schema";

describe("Song-to-Picture Plan schema",()=>{
  it("allows an honest empty draft",()=>{
    expect(songPicturePlanDraftSchema.parse(EMPTY_SONG_PICTURE_PLAN)).toEqual(EMPTY_SONG_PICTURE_PLAN);
  });

  it("requires substantive full-song passages before completion",()=>{
    expect(songPicturePlanCompletionIssues(EMPTY_SONG_PICTURE_PLAN,{
      durationMs:60000,treatmentSectionCount:2,acceptedAnchorIds:new Set()
    }).length).toBeGreaterThan(0);
  });

  it("accepts a contiguous plan pinned to valid Treatment sections and anchors",()=>{
    const anchorA="11111111-1111-4111-8111-111111111111";
    const anchorB="22222222-2222-4222-8222-222222222222";
    const document={
      title:"Threshold Picture Plan",
      governingStrategy:"Move from spatial constraint to shared release without inventing new story events.",
      visualEscalation:"Picture width, mobility and visual intensity expand as the song opens.",
      narrativeDistribution:"The first passage establishes intent; the second resolves it through action.",
      performanceDistribution:"Performance is restrained early and integrated with the world after release.",
      transitionStrategy:"Structural musical changes motivate visual passage boundaries.",
      endingStrategy:"Resolve on the opened threshold with enough duration to register the final state.",
      passages:[
        {
          title:"Containment",startMs:0,endMs:30000,treatmentSectionIndexes:[0],musicAnchorIds:[anchorA],
          dramaticPurpose:"Establish constraint.",pictureState:"Tight bounded spaces.",narrativeState:"Search without crossing.",
          characterState:"Observer becoming intentional.",performanceMode:"Minimal direct performance.",worldState:"Closed architecture.",
          motifState:"Doorway remains closed.",creativeLanguageApplication:"Use restrained composition and practical light.",
          cameraAndMotionIntent:"Mostly locked camera.",editingRhythm:"Longer holds.",transitionIn:"Open from black.",
          transitionOut:"Cut on structural release.",visualIntensity:35
        },
        {
          title:"Release",startMs:30000,endMs:60000,treatmentSectionIndexes:[1],musicAnchorIds:[anchorB],
          dramaticPurpose:"Deliver release.",pictureState:"Wider connected space.",narrativeState:"Crossing becomes participation.",
          characterState:"Intent becomes action.",performanceMode:"Performance integrates with movement.",worldState:"Barriers become passages.",
          motifState:"Doorway becomes open passage.",creativeLanguageApplication:"Use wider frames and warmer available light.",
          cameraAndMotionIntent:"Earn longer traversal.",editingRhythm:"More active but still motivated.",transitionIn:"Continue direction through release.",
          transitionOut:"Sustain final image.",visualIntensity:80
        }
      ]
    };
    expect(songPicturePlanDocumentSchema.parse(document).passages).toHaveLength(2);
    expect(songPicturePlanCompletionIssues(document,{
      durationMs:60000,treatmentSectionCount:2,acceptedAnchorIds:new Set([anchorA,anchorB])
    })).toEqual([]);
  });
});
