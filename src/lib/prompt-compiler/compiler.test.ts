import { describe,expect,it } from "vitest";
import { compileShotGenerationRequest } from "./compiler";
import type { ShotSpecificationSpec } from "@/lib/shot-specifications/schema";

const shot:ShotSpecificationSpec={
  schemaVersion:1,
  stage:"SHOT_SPECIFICATION",
  sourceStoryboardShotVersionId:"11111111-1111-4111-8111-111111111111",
  sourceStoryboardShotNodeId:"22222222-2222-4222-8222-222222222222",
  sourceSequenceVersionId:"33333333-3333-4333-8333-333333333333",
  sourceSequenceNodeId:"44444444-4444-4444-8444-444444444444",
  sourceSequencePosition:0,
  sourceShotPosition:0,
  sourceCreativeLanguageVersionId:"55555555-5555-4555-8555-555555555555",
  generationJobId:"66666666-6666-4666-8666-666666666666",
  origin:"GENERATED",
  composition:"Centered subject with a deep architectural vanishing point",
  framing:"Medium wide",
  cameraAngle:"Eye level",
  lens:"35mm equivalent",
  lighting:"Soft motivated side light",
  colorTreatment:"Warm highlights with neutral shadows",
  cameraMotion:"Slow lateral dolly",
  subjectMotion:"Measured walk toward camera",
  performanceDirection:"Contained, direct eyeline at final beat",
  focusAndDepth:"Moderate depth of field",
  continuityNotes:"Maintain screen direction",
  wardrobeNotes:"Black jacket",
  propsNotes:"",
  transitionIn:"",
  transitionOut:"Cut on motion",
  generationHandlesMs:250,
  requiredElements:["Subject remains identifiable"],
  exclusions:["No background crowd"],
  productionNotes:""
};

describe("prompt compiler",()=>{
  it("compiles a deterministic provider-neutral video request",()=>{
    const request=compileShotGenerationRequest({
      sourceShotSpecificationVersionId:"77777777-7777-4777-8777-777777777777",
      sourceStoryboardShotVersionId:shot.sourceStoryboardShotVersionId,
      shot,
      mediaKind:"VIDEO",
      editorialDurationMs:4000,
      aspectRatio:"16:9",
      frameRate:24
    });

    expect(request.generationDurationMs).toBe(4500);
    expect(request.capabilityRequirements.imageToVideo).toBe(true);
    expect(request.capabilityRequirements.firstFrame).toBe(true);
    expect(request.prompt).toContain("Slow lateral dolly");
    expect(request.negativeConstraints).toContain("No background crowd");
    expect(request.requestFingerprintInput.prompt).toBe(request.prompt);
  });

  it("treats keyframes separately from generic reference-image conditioning",()=>{
    const request=compileShotGenerationRequest({
      sourceShotSpecificationVersionId:"77777777-7777-4777-8777-777777777777",
      sourceStoryboardShotVersionId:shot.sourceStoryboardShotVersionId,
      shot,
      mediaKind:"VIDEO",
      editorialDurationMs:4000,
      aspectRatio:"16:9",
      frameRate:24,
      referenceDescriptions:[{
        role:"FIRST_FRAME",
        required:true,
        description:"Approved Initial Frame"
      }]
    });
    expect(request.capabilityRequirements.firstFrame).toBe(true);
    expect(request.capabilityRequirements.referenceImages).toBe(false);
  });

  it("does not embed provider or model identifiers",()=>{
    const request=compileShotGenerationRequest({
      sourceShotSpecificationVersionId:"77777777-7777-4777-8777-777777777777",
      sourceStoryboardShotVersionId:shot.sourceStoryboardShotVersionId,
      shot,
      mediaKind:"IMAGE",
      editorialDurationMs:1000,
      aspectRatio:"9:16",
      frameRate:24
    });
    expect(JSON.stringify(request)).not.toMatch(/openai|runway|modelId|providerId/i);
  });
});
