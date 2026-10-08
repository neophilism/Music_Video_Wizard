import { z } from "zod";

const revision=z.number().int().min(0);

export const shotSpecificationsGenerationSchema=z.object({
  expectedWizardRevision:revision,
  direction:z.string().trim().max(6000).default("")
}).strict();

export const queuedShotSpecificationsGenerationSchema=z.object({
  textOperation:z.literal("shot-specifications"),
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  sourceStoryboardShotVersionIds:z.array(z.string().uuid()).min(1).max(1000),
  sourceCreativeLanguageVersionId:z.string().uuid(),
  direction:z.string().max(6000)
}).strict();

export const shotSpecificationsActionSchema=z.object({
  action:z.literal("lock"),
  expectedWizardRevision:revision
}).strict();
