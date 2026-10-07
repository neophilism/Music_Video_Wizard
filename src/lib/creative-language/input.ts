import { z } from "zod";
import { creativeLanguageDraftSchema } from "./schema";

export const creativeLanguageActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("initialize") }),
  z.object({
    action: z.literal("save"),
    creativeLanguageVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0),
    document: creativeLanguageDraftSchema
  }),
  z.object({
    action: z.literal("complete"),
    creativeLanguageVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("reopen"),
    creativeLanguageVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("lock"),
    creativeLanguageVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  })
]);

export const creativeLanguageGenerationSchema = z.object({
  creativeLanguageVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  direction: z.string().trim().max(5000).default("")
});

export const queuedCreativeLanguageGenerationSchema = z.object({
  textOperation: z.literal("creative-language"),
  projectId: z.string().uuid(),
  projectVersionId: z.string().uuid(),
  creativeLanguageVersionId: z.string().uuid(),
  treatmentVersionId: z.string().uuid(),
  direction: z.string().max(5000)
});
