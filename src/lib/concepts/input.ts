import { z } from "zod";

export const conceptSetActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("initialize") }),
  z.object({
    action: z.literal("complete"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("reopen"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("lock"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  })
]);

export const conceptSelectionSchema = z.object({
  conceptSetVersionId: z.string().uuid(),
  conceptId: z.string().uuid(),
  expectedRevision: z.number().int().min(0)
});

export const conceptGenerationRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("generate"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    count: z.number().int().min(2).max(6).default(4),
    direction: z.string().trim().max(4000).default("")
  }),
  z.object({
    operation: z.literal("revise"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    parentConceptId: z.string().uuid(),
    instruction: z.string().trim().min(1).max(5000)
  }),
  z.object({
    operation: z.literal("combine"),
    conceptSetVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    parentConceptIds: z.array(z.string().uuid()).min(2).max(4),
    instruction: z.string().trim().max(5000).default("")
  })
]);

export const queuedConceptGenerationSchema = z.object({
  textOperation: z.literal("concepts"),
  projectId: z.string().uuid(),
  projectVersionId: z.string().uuid(),
  conceptSetVersionId: z.string().uuid(),
  creativeBriefVersionId: z.string().uuid(),
  operation: z.enum(["generate", "revise", "combine"]),
  count: z.number().int().min(1).max(6),
  direction: z.string().max(5000),
  parentConceptIds: z.array(z.string().uuid()).max(4)
});

export type QueuedConceptGeneration = z.infer<
  typeof queuedConceptGenerationSchema
>;
