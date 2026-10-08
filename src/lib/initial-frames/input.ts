import { z } from "zod";
import { compiledGenerationRequestSchema } from "@/lib/prompt-compiler/schema";

const revision=z.number().int().min(0);

export const initialFramesGenerationSchema=z.object({
  expectedWizardRevision:revision,
  shotSpecificationVersionIds:z.array(z.string().uuid()).max(1000).default([])
}).strict();

export const queuedInitialFrameGenerationSchema=z.object({
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  shotSpecificationVersionId:z.string().uuid(),
  shotSpecificationNodeId:z.string().uuid(),
  sourceStoryboardShotVersionId:z.string().uuid(),
  request:compiledGenerationRequestSchema
}).strict();

export const initialFramesActionSchema=z.object({
  action:z.literal("lock"),
  expectedWizardRevision:revision
}).strict();

export type QueuedInitialFrameGeneration=z.infer<
  typeof queuedInitialFrameGenerationSchema
>;
