import { z } from "zod";

export const motifTypeValues = [
  "OBJECT",
  "COLOR",
  "LIGHT",
  "SHAPE",
  "GESTURE",
  "LOCATION",
  "WARDROBE",
  "PROP",
  "SYMBOL",
  "TEXTURE",
  "CAMERA_BEHAVIOR",
  "OTHER"
] as const;

export const motifRecurrenceModeValues = [
  "FIXED",
  "ESCALATING",
  "EVOLVING",
  "CALLBACK",
  "CONDITIONAL"
] as const;

const text = z.string().trim().max(5000);
const token = z.string().trim().min(1).max(200);

export const motifDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  motifType: z.enum(motifTypeValues),
  visualSignature: text,
  semanticFunction: text,
  introduction: text,
  recurrence: z.object({
    mode: z.enum(motifRecurrenceModeValues),
    cueGuidance: text,
    minimumOccurrences: z.number().int().min(0).max(100).nullable(),
    maximumOccurrences: z.number().int().min(1).max(100).nullable()
  }).strict(),
  evolution: text,
  variationRules: z.array(token).max(30),
  prohibitedUses: z.array(token).max(30),
  continuity: text,
  providerHints: z.array(z.object({
    provider: token,
    settings: text.min(1)
  }).strict()).max(12)
}).strict().superRefine((value, ctx) => {
  if (
    value.recurrence.minimumOccurrences !== null &&
    value.recurrence.maximumOccurrences !== null &&
    value.recurrence.minimumOccurrences > value.recurrence.maximumOccurrences
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["recurrence", "maximumOccurrences"],
      message: "Maximum occurrences must be greater than or equal to minimum occurrences."
    });
  }
});

export type MotifDefinition = z.infer<typeof motifDefinitionSchema>;

export const EMPTY_MOTIF: MotifDefinition = {
  schemaVersion: 1,
  motifType: "SYMBOL",
  visualSignature: "",
  semanticFunction: "",
  introduction: "",
  recurrence: {
    mode: "EVOLVING",
    cueGuidance: "",
    minimumOccurrences: null,
    maximumOccurrences: null
  },
  evolution: "",
  variationRules: [],
  prohibitedUses: [],
  continuity: "",
  providerHints: []
};

export function parseMotifDefinition(value: unknown): MotifDefinition {
  return motifDefinitionSchema.parse(value);
}

export function motifCompletionIssues(value: unknown): string[] {
  const parsed = motifDefinitionSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);

  const motif = parsed.data;
  const issues: string[] = [];
  if (!motif.visualSignature) issues.push("Describe the motif's visual signature.");
  if (!motif.semanticFunction) issues.push("Describe what the motif means or accomplishes.");
  if (!motif.introduction) issues.push("Describe how the motif is introduced.");
  if (!motif.recurrence.cueGuidance) issues.push("Describe when the motif should recur.");
  if (!motif.evolution) issues.push("Describe how the motif evolves or state that it remains fixed.");
  return issues;
}
