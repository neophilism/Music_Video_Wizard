import { z } from "zod";

const shortItem = z.string().trim().min(1).max(240);
const itemList = z.array(shortItem).max(32);

export const literalMetaphoricalModeSchema = z.enum([
  "LITERAL",
  "MOSTLY_LITERAL",
  "BALANCED",
  "MOSTLY_METAPHORICAL",
  "METAPHORICAL"
]);

export const artistPresenceSchema = z.enum([
  "NONE",
  "CAMEO",
  "PERFORMANCE",
  "NARRATIVE_CHARACTER",
  "MIXED",
  "CENTRAL"
]);

export const visualDialogueModeSchema = z.enum([
  "ILLUSTRATIVE",
  "COMPLEMENTARY",
  "COUNTERPOINT",
  "ABSTRACT_ASSOCIATIVE",
  "MIXED"
]);

export const creativeBriefDraftSchema = z.object({
  objective: z.string().max(6000),
  audience: z.string().max(3000),
  desiredFeelings: itemList,
  tone: itemList,
  contentMix: z.object({
    narrative: z.number().int().min(0).max(100),
    performance: z.number().int().min(0).max(100),
    abstract: z.number().int().min(0).max(100)
  }),
  literalMetaphoricalMode: literalMetaphoricalModeSchema.nullable(),
  literalMetaphoricalNotes: z.string().max(4000),
  artistPresence: artistPresenceSchema.nullable(),
  artistPresenceNotes: z.string().max(4000),
  visualDialogueMode: visualDialogueModeSchema.nullable(),
  visualDialogueNotes: z.string().max(4000),
  requiredImagery: itemList,
  avoidedImagery: itemList,
  evolution: z.string().max(6000),
  endingResolution: z.string().max(6000),
  recurringSymbols: itemList,
  culturalPeriodInfluences: itemList,
  references: itemList,
  constraints: itemList,
  notes: z.string().max(8000)
});

export type CreativeBriefDraft = z.infer<typeof creativeBriefDraftSchema>;

export const EMPTY_CREATIVE_BRIEF: CreativeBriefDraft = {
  objective: "",
  audience: "",
  desiredFeelings: [],
  tone: [],
  contentMix: {
    narrative: 0,
    performance: 0,
    abstract: 0
  },
  literalMetaphoricalMode: null,
  literalMetaphoricalNotes: "",
  artistPresence: null,
  artistPresenceNotes: "",
  visualDialogueMode: null,
  visualDialogueNotes: "",
  requiredImagery: [],
  avoidedImagery: [],
  evolution: "",
  endingResolution: "",
  recurringSymbols: [],
  culturalPeriodInfluences: [],
  references: [],
  constraints: [],
  notes: ""
};

export function creativeBriefCompletionIssues(
  draft: CreativeBriefDraft
): string[] {
  const issues: string[] = [];
  const mixTotal =
    draft.contentMix.narrative +
    draft.contentMix.performance +
    draft.contentMix.abstract;

  if (!draft.objective.trim()) issues.push("Define the video's primary objective.");
  if (!draft.audience.trim()) issues.push("Define the intended audience.");
  if (draft.desiredFeelings.length === 0) {
    issues.push("Choose at least one feeling the video should create.");
  }
  if (draft.tone.length === 0) {
    issues.push("Choose at least one tonal direction.");
  }
  if (mixTotal !== 100) {
    issues.push("Narrative, performance, and abstract percentages must total 100%.");
  }
  if (!draft.literalMetaphoricalMode) {
    issues.push("Choose the literal-to-metaphorical mode.");
  }
  if (!draft.artistPresence) {
    issues.push("Choose how the artist appears, including no appearance if desired.");
  }
  if (!draft.visualDialogueMode) {
    issues.push("Choose how the images relate to the song and lyrics.");
  }
  if (!draft.evolution.trim()) {
    issues.push("Define how the video should evolve across the song.");
  }
  if (!draft.endingResolution.trim()) {
    issues.push("Define how the ending should resolve or remain unresolved.");
  }

  return issues;
}

export const creativeBriefSaveSchema = z.object({
  briefVersionId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  payload: creativeBriefDraftSchema
});

export const creativeBriefActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("initialize") }),
  z.object({
    action: z.literal("complete"),
    briefVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("reopen"),
    briefVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  }),
  z.object({
    action: z.literal("lock"),
    briefVersionId: z.string().uuid(),
    expectedRevision: z.number().int().min(0)
  })
]);
