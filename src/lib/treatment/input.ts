import { z } from "zod";
import { treatmentDocumentSchema } from "./schema";

export const treatmentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("initialize") }),
  z.object({
    action: z.literal("save"),
    treatmentVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    treatment: treatmentDocumentSchema
  }),
  z.object({
    action: z.literal("complete"),
    treatmentVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("reopen"),
    treatmentVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("lock"),
    treatmentVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  })
]);

export const treatmentGenerationSchema = z.object({
  treatmentVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  direction: z.string().trim().max(5000).default("")
});

export const queuedTreatmentGenerationSchema = z.object({
  textOperation: z.literal("treatment"),
  projectId: z.string().uuid(),
  projectVersionId: z.string().uuid(),
  treatmentVersionId: z.string().uuid(),
  conceptSetVersionId: z.string().uuid(),
  conceptId: z.string().uuid(),
  direction: z.string().max(5000)
});
