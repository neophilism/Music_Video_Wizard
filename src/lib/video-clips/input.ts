import { z } from "zod";
import { compiledGenerationRequestSchema } from "@/lib/prompt-compiler/schema";

const revision=z.number().int().min(0);

export const videoClipsGenerationSchema=z.object({
  expectedWizardRevision:revision,
  shotSpecificationVersionIds:z.array(z.string().uuid()).max(1000).default([])
}).strict();

export const queuedVideoClipGenerationSchema=z.object({
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  shotSpecificationVersionId:z.string().uuid(),
  shotSpecificationNodeId:z.string().uuid(),
  sourceStoryboardShotVersionId:z.string().uuid(),
  initialFrameAssetVersionId:z.string().uuid(),
  initialFrameNodeId:z.string().uuid(),
  request:compiledGenerationRequestSchema
}).strict();

export const videoClipsActionSchema=z.object({
  action:z.literal("lock"),
  expectedWizardRevision:revision
}).strict();
