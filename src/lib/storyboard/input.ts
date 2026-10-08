import { z } from "zod";

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
