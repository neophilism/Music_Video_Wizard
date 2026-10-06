import { z } from "zod";

export const projectSetupDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "2.39:1"]),
  frameRate: z
    .number()
    .refine(
      (value) => [23.976, 24, 25, 29.97, 30, 60].includes(value),
      "Unsupported frame rate"
    )
});

export type ProjectSetupDraft = z.infer<typeof projectSetupDraftSchema>;

export const wizardSaveSchema = z.object({
  expectedRevision: z.number().int().min(0),
  payload: z.unknown()
});

export const wizardTransitionSchema = z.object({
  expectedRevision: z.number().int().min(0),
  action: z.enum(["complete", "lock", "reopen"])
});

export const wizardNavigateSchema = z.object({
  stepKey: z.string().min(1).max(128)
});
