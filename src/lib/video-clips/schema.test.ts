import { describe,expect,it } from "vitest";
import {
  parseVideoClipMetadata
} from "./source";
import {
  videoClipsGenerationSchema
} from "./input";

describe("Video Clips contracts",()=>{
  it("uses an empty requested list as generate all",()=>{
    expect(videoClipsGenerationSchema.parse({
      expectedWizardRevision:3
    }).shotSpecificationVersionIds).toEqual([]);
  });

  it("parses exact clip lineage metadata",()=>{
    expect(parseVideoClipMetadata({
      role:"video-clip",
      logicalShotId:"shot",
      sourceShotSpecificationVersionId:"spec",
      sourceInitialFrameAssetVersionId:"frame",
      sourceStoryboardShotVersionId:"storyboard",
      generationJobId:"job",
      providerId:"runway",
      modelId:"gen4.5",
      editorialDurationMs:1800,
      generatedDurationMs:2300
    })).toMatchObject({
      sourceShotSpecificationVersionId:"spec",
      sourceInitialFrameAssetVersionId:"frame"
    });
  });
});
