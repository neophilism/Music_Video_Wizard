import { describe, expect, it } from "vitest";
import {
  queuedStoryboardShotRegenerationSchema,
  storyboardEditorActionSchema,
  storyboardShotRegenerationSchema
} from "./input";
import { storyboardShotSpecSchema } from "./schema";

describe("storyboard editor contracts",()=>{
  it("accepts a complete manual rewrite action",()=>{
    const parsed=storyboardEditorActionSchema.parse({
      action:"rewrite",
      expectedWizardRevision:7,
      shotVersionId:"11111111-1111-4111-8111-111111111111",
      fields:{
        label:"Close-up turn",
        dramaticPurpose:"Shift the emotional balance.",
        beat:"The performer looks directly into lens.",
        subject:"Performer",
        action:"Turns toward camera.",
        environment:"Night street.",
        framingIntent:"Tight close-up.",
        cameraIntent:"Locked camera.",
        continuityNotes:"Preserve screen direction.",
        transitionIn:"",
        transitionOut:"Cut on phrase ending.",
        visualIntensity:72
      }
    });
    expect(parsed.action).toBe("rewrite");
  });

  it("supports split, merge, duplicate, reorder and lifecycle actions",()=>{
    expect(storyboardEditorActionSchema.parse({
      action:"split",
      expectedWizardRevision:1,
      shotVersionId:"11111111-1111-4111-8111-111111111111",
      splitAtMs:1500
    }).action).toBe("split");

    expect(storyboardEditorActionSchema.parse({
      action:"merge",
      expectedWizardRevision:1,
      firstShotVersionId:"11111111-1111-4111-8111-111111111111",
      secondShotVersionId:"22222222-2222-4222-8222-222222222222"
    }).action).toBe("merge");

    expect(storyboardEditorActionSchema.parse({
      action:"duplicate",
      expectedWizardRevision:1,
      shotVersionId:"11111111-1111-4111-8111-111111111111"
    }).action).toBe("duplicate");

    expect(storyboardEditorActionSchema.parse({
      action:"reorder",
      expectedWizardRevision:1,
      sequenceVersionId:"33333333-3333-4333-8333-333333333333",
      orderedShotVersionIds:[
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222"
      ]
    }).action).toBe("reorder");

    expect(storyboardEditorActionSchema.parse({
      action:"lock",
      expectedWizardRevision:1
    }).action).toBe("lock");
  });

  it("keeps old generated shot specs readable while distinguishing manual revisions",()=>{
    const generated=storyboardShotSpecSchema.parse({
      schemaVersion:1,
      stage:"STORYBOARD",
      sourceSequenceVersionId:"11111111-1111-4111-8111-111111111111",
      sourceSequenceNodeId:"22222222-2222-4222-8222-222222222222",
      sourceSequencePosition:0,
      sourceShotPosition:0,
      beat:"Original generated beat.",
      environment:"Street",
      framingIntent:"Wide",
      cameraIntent:"Static",
      visualIntensity:40,
      generationJobId:"33333333-3333-4333-8333-333333333333"
    });
    expect(generated.origin).toBe("GENERATED");

    const manual=storyboardShotSpecSchema.parse({
      ...generated,
      origin:"MANUAL",
      generationJobId:null
    });
    expect(manual.origin).toBe("MANUAL");
    expect(manual.generationJobId).toBeNull();
  });

  it("validates targeted regeneration requests and queue snapshots",()=>{
    expect(storyboardShotRegenerationSchema.parse({
      expectedWizardRevision:4,
      shotVersionId:"11111111-1111-4111-8111-111111111111",
      direction:"Make the performance more restrained."
    }).direction).toContain("restrained");

    expect(queuedStoryboardShotRegenerationSchema.parse({
      textOperation:"storyboard-shot",
      projectId:"11111111-1111-4111-8111-111111111111",
      projectVersionId:"22222222-2222-4222-8222-222222222222",
      sequenceVersionId:"33333333-3333-4333-8333-333333333333",
      shotVersionId:"44444444-4444-4444-8444-444444444444",
      direction:""
    }).textOperation).toBe("storyboard-shot");
  });
});
