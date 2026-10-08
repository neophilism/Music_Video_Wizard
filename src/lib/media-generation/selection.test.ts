import { describe,expect,it } from "vitest";
import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import { requireMediaModel,selectMediaModel } from "./selection";
import type { MediaModelDescriptor } from "./types";

const request:CompiledGenerationRequest={
  schemaVersion:1,
  mediaKind:"VIDEO",
  sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
  sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
  editorialDurationMs:4000,
  generationDurationMs:4500,
  aspectRatio:"16:9",
  frameRate:24,
  prompt:"Create the locked shot.",
  negativeConstraints:["No crowd"],
  referenceRequirements:[],
  capabilityRequirements:{
    textToImage:false,
    imageEditing:false,
    imageToVideo:true,
    referenceImages:false,
    firstFrame:true,
    lastFrame:false,
    minDurationMs:4500,
    maxDurationMs:4500
  },
  requestFingerprintInput:{
    sourceShotSpecificationVersionId:"11111111-1111-4111-8111-111111111111",
    sourceStoryboardShotVersionId:"22222222-2222-4222-8222-222222222222",
    mediaKind:"VIDEO",
    editorialDurationMs:4000,
    generationDurationMs:4500,
    aspectRatio:"16:9",
    frameRate:24,
    prompt:"Create the locked shot.",
    negativeConstraints:["No crowd"]
  }
};

const model=(overrides:Partial<MediaModelDescriptor>={}):MediaModelDescriptor=>({
  providerId:"provider-a",
  modelId:"video-1",
  enabled:true,
  priority:10,
  capabilities:{
    textToImage:false,
    imageEditing:false,
    imageToVideo:true,
    referenceImages:true,
    firstFrame:true,
    lastFrame:false,
    minDurationMs:1000,
    maxDurationMs:10000,
    aspectRatios:["16:9","9:16"],
    resolutions:["1080p"]
  },
  ...overrides
});

describe("media model selection",()=>{
  it("chooses the lowest-priority-number compatible model deterministically",()=>{
    const result=selectMediaModel([
      model({providerId:"provider-b",priority:20}),
      model({providerId:"provider-a",priority:5})
    ],request);
    expect(result.model?.providerId).toBe("provider-a");
  });

  it("rejects models that cannot satisfy required capabilities",()=>{
    const incompatible=model({
      capabilities:{...model().capabilities,firstFrame:false}
    });
    const result=selectMediaModel([incompatible],request);
    expect(result.model).toBeNull();
    expect(result.rejected[0]?.reasons).toContain("first frame unsupported");
  });

  it("allows a provider to over-generate its minimum duration and trim later",()=>{
    const shortRequest={
      ...request,
      generationDurationMs:1000,
      capabilityRequirements:{
        ...request.capabilityRequirements,
        minDurationMs:1000,
        maxDurationMs:1000
      },
      requestFingerprintInput:{
        ...request.requestFingerprintInput,
        generationDurationMs:1000
      }
    };
    const twoSecondMinimum=model({
      capabilities:{...model().capabilities,minDurationMs:2000}
    });
    expect(selectMediaModel([twoSecondMinimum],shortRequest).model).not.toBeNull();
  });

  it("fails explicitly instead of degrading a request beyond provider maximum",()=>{
    const incompatible=model({
      capabilities:{...model().capabilities,maxDurationMs:3000}
    });
    expect(()=>requireMediaModel([incompatible],request))
      .toThrow(/No configured media generation model satisfies/);
  });
});
