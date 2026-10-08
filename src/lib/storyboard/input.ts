import { z } from "zod";

const text=(max:number)=>z.string().trim().max(max);
const req=(max:number)=>z.string().trim().min(1).max(max);

export const storyboardGenerationSchema=z.object({
  expectedWizardRevision:z.number().int().min(0),
  direction:z.string().trim().max(5000).default("")
});

export const queuedStoryboardGenerationSchema=z.object({
  textOperation:z.literal("storyboard"),
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  sequenceVersionIds:z.array(z.string().uuid()).min(1).max(64),
  direction:z.string().max(5000)
});

export const storyboardRewriteFieldsSchema=z.object({
  label:req(180),
  dramaticPurpose:req(4000),
  beat:req(4000),
  subject:req(3000),
  action:req(4000),
  environment:req(4000),
  framingIntent:req(3000),
  cameraIntent:req(3000),
  continuityNotes:text(3000),
  transitionIn:text(2200),
  transitionOut:text(2200),
  visualIntensity:z.number().int().min(0).max(100)
}).strict();

const revision=z.number().int().min(0);

export const storyboardEditorActionSchema=z.discriminatedUnion("action",[
  z.object({
    action:z.literal("rewrite"),
    expectedWizardRevision:revision,
    shotVersionId:z.string().uuid(),
    fields:storyboardRewriteFieldsSchema
  }).strict(),
  z.object({
    action:z.literal("split"),
    expectedWizardRevision:revision,
    shotVersionId:z.string().uuid(),
    splitAtMs:z.number().int().min(1)
  }).strict(),
  z.object({
    action:z.literal("merge"),
    expectedWizardRevision:revision,
    firstShotVersionId:z.string().uuid(),
    secondShotVersionId:z.string().uuid()
  }).strict(),
  z.object({
    action:z.literal("duplicate"),
    expectedWizardRevision:revision,
    shotVersionId:z.string().uuid()
  }).strict(),
  z.object({
    action:z.literal("reorder"),
    expectedWizardRevision:revision,
    sequenceVersionId:z.string().uuid(),
    orderedShotVersionIds:z.array(z.string().uuid()).min(1).max(200)
  }).strict(),
  z.object({
    action:z.enum(["complete","reopen","lock"]),
    expectedWizardRevision:revision
  }).strict()
]);

export const storyboardShotRegenerationSchema=z.object({
  expectedWizardRevision:revision,
  shotVersionId:z.string().uuid(),
  direction:z.string().trim().max(5000).default("")
}).strict();

export const queuedStoryboardShotRegenerationSchema=z.object({
  textOperation:z.literal("storyboard-shot"),
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  sequenceVersionId:z.string().uuid(),
  shotVersionId:z.string().uuid(),
  direction:z.string().max(5000)
});
