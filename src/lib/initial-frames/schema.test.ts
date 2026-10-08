import { describe,expect,it } from "vitest";
import {
  initialFramesGenerationSchema,
  queuedInitialFrameGenerationSchema
} from "./input";

describe("Initial Frames input contracts",()=>{
  it("treats an omitted specification list as generate all",()=>{
    expect(initialFramesGenerationSchema.parse({
      expectedWizardRevision:4
    }).shotSpecificationVersionIds).toEqual([]);
  });

  it("requires a compiled IMAGE request in queued jobs",()=>{
    expect(()=>queuedInitialFrameGenerationSchema.parse({
      projectId:"11111111-1111-4111-8111-111111111111",
      projectVersionId:"22222222-2222-4222-8222-222222222222",
      shotSpecificationVersionId:"33333333-3333-4333-8333-333333333333",
      shotSpecificationNodeId:"44444444-4444-4444-8444-444444444444",
      sourceStoryboardShotVersionId:"55555555-5555-4555-8555-555555555555",
      request:{
        schemaVersion:1,
        mediaKind:"VIDEO"
      }
    })).toThrow();
  });
});
