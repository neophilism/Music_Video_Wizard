import { z } from "zod";

export const musicMapInitializeSchema = z.object({
  action: z.literal("initialize")
});

export const musicMapCompleteSchema = z.object({
  action: z.literal("complete"),
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0)
});

export const musicMapLockSchema = z.object({
  action: z.literal("lock"),
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0)
});

export const musicMapActionSchema = z.discriminatedUnion("action", [
  musicMapInitializeSchema,
  musicMapCompleteSchema,
  musicMapLockSchema
]);

export const musicMapGridPatchSchema = z.object({
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  mode: z.enum(["manual-tempo", "analysis"]),
  tempoBpm: z.number().positive().max(400).optional(),
  meterNumerator: z.number().int().min(1).max(32).optional(),
  meterDenominator: z.number().int().refine(
    (value) => [1, 2, 4, 8, 16, 32].includes(value),
    "Unsupported meter denominator"
  ).optional(),
  beatOffsetMs: z.number().int().min(0).optional(),
  barPhase: z.number().int().min(0).max(31).optional()
});

export const musicMapAnchorCreateSchema = z.object({
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  kind: z.enum([
    "SECTION",
    "INTRO",
    "OUTRO",
    "BEAT",
    "BAR",
    "DROP",
    "TRANSITION",
    "VOCAL_PASSAGE",
    "INSTRUMENTAL_BREAK",
    "CUSTOM"
  ]),
  label: z.string().trim().min(1).max(160),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0).nullable().optional()
});

export const musicMapAnchorPatchSchema = z.object({
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  label: z.string().trim().min(1).max(160).optional(),
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().min(0).nullable().optional(),
  decision: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional()
});

export const musicMapAnchorDeleteSchema = z.object({
  mapVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0)
});
