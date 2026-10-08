import { z } from "zod";

const revision=z.number().int().min(0);

export const firstCutBuildSchema=z.object({
  expectedWizardRevision:revision
}).strict();

export const firstCutActionSchema=z.object({
  action:z.literal("lock"),
  expectedWizardRevision:revision
}).strict();
