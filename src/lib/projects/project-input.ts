import { z } from "zod";

export const aspectRatioPresets = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
  "2.39:1": { width: 2048, height: 858 }
} as const;

const frameRates = [23.976, 24, 25, 29.97, 30, 60] as const;

export const projectCreationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3", "2.39:1"]).default("16:9"),
  frameRate: z.coerce
    .number()
    .refine(
      (value) => frameRates.some((candidate) => candidate === value),
      "Unsupported frame rate"
    )
    .default(24)
});

export type ProjectCreationInput = z.infer<typeof projectCreationSchema>;

export function parseProjectCreationForm(form: FormData): ProjectCreationInput {
  return projectCreationSchema.parse({
    title: form.get("title"),
    description: form.get("description") ?? "",
    aspectRatio: form.get("aspectRatio") ?? "16:9",
    frameRate: form.get("frameRate") ?? "24"
  });
}
