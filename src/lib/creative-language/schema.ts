import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const short = (required: boolean) => required ? requiredText(360) : text(360);
const paragraph = (required: boolean) => required ? requiredText(6000) : text(6000);

function characterSchema(required: boolean) {
  return z.object({
    name: short(required),
    identity: paragraph(required),
    appearance: paragraph(required),
    performance: paragraph(required),
    continuity: paragraph(required)
  });
}

function locationSchema(required: boolean) {
  return z.object({
    name: short(required),
    visualRules: paragraph(required),
    evolution: paragraph(required),
    continuity: paragraph(required)
  });
}

function wardrobeSchema(required: boolean) {
  return z.object({
    name: short(required),
    appliesTo: short(required),
    description: paragraph(required),
    continuity: paragraph(required)
  });
}

function motifSchema(required: boolean) {
  return z.object({
    name: short(required),
    visualTreatment: paragraph(required),
    meaning: paragraph(required),
    continuity: paragraph(required)
  });
}

function languageSchema(required: boolean) {
  const p = paragraph(required);
  const line = short(required);
  return z.object({
    title: required ? requiredText(220) : text(220),
    governingIdea: p,
    visualAesthetic: p,
    colorSystem: p,
    materialsAndTexture: p,
    lightingGrammar: p,
    compositionGrammar: p,
    cinematographyGrammar: p,
    cameraMotionGrammar: p,
    subjectMotionGrammar: p,
    performanceGrammar: p,
    editingGrammar: p,
    transitionGrammar: p,
    pacingCurve: p,
    worldRules: p,
    continuityRules: p,
    typographyAndGraphics: p,
    characters: z.array(characterSchema(required)).max(16),
    locations: z.array(locationSchema(required)).max(16),
    wardrobe: z.array(wardrobeSchema(required)).max(20),
    motifsAndProps: z.array(motifSchema(required)).max(24),
    positiveGenerationLanguage: z.array(line).max(40),
    negativeGenerationLanguage: z.array(line).max(40),
    hardExclusions: z.array(line).max(40),
    notes: text(6000)
  });
}

export const creativeLanguageDraftSchema = languageSchema(false);
export const creativeLanguageDocumentSchema = languageSchema(true).superRefine((value, ctx) => {
  if (value.positiveGenerationLanguage.length < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["positiveGenerationLanguage"],
      message: "Add at least three positive generation rules."
    });
  }
  if (value.hardExclusions.length < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["hardExclusions"],
      message: "Add at least one hard exclusion."
    });
  }
});

export type CreativeLanguageDraft = z.infer<typeof creativeLanguageDraftSchema>;
export type CreativeLanguageDocument = z.infer<typeof creativeLanguageDocumentSchema>;

export const EMPTY_CREATIVE_LANGUAGE: CreativeLanguageDraft = {
  title: "",
  governingIdea: "",
  visualAesthetic: "",
  colorSystem: "",
  materialsAndTexture: "",
  lightingGrammar: "",
  compositionGrammar: "",
  cinematographyGrammar: "",
  cameraMotionGrammar: "",
  subjectMotionGrammar: "",
  performanceGrammar: "",
  editingGrammar: "",
  transitionGrammar: "",
  pacingCurve: "",
  worldRules: "",
  continuityRules: "",
  typographyAndGraphics: "",
  characters: [],
  locations: [],
  wardrobe: [],
  motifsAndProps: [],
  positiveGenerationLanguage: [],
  negativeGenerationLanguage: [],
  hardExclusions: [],
  notes: ""
};

export function creativeLanguageCompletionIssues(
  draft: CreativeLanguageDraft
): string[] {
  const result = creativeLanguageDocumentSchema.safeParse(draft);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
}

const characterJson = {
  type: "object",
  properties: {
    name: { type: "string" },
    identity: { type: "string" },
    appearance: { type: "string" },
    performance: { type: "string" },
    continuity: { type: "string" }
  },
  required: ["name", "identity", "appearance", "performance", "continuity"],
  additionalProperties: false
} as const;

const locationJson = {
  type: "object",
  properties: {
    name: { type: "string" },
    visualRules: { type: "string" },
    evolution: { type: "string" },
    continuity: { type: "string" }
  },
  required: ["name", "visualRules", "evolution", "continuity"],
  additionalProperties: false
} as const;

const wardrobeJson = {
  type: "object",
  properties: {
    name: { type: "string" },
    appliesTo: { type: "string" },
    description: { type: "string" },
    continuity: { type: "string" }
  },
  required: ["name", "appliesTo", "description", "continuity"],
  additionalProperties: false
} as const;

const motifJson = {
  type: "object",
  properties: {
    name: { type: "string" },
    visualTreatment: { type: "string" },
    meaning: { type: "string" },
    continuity: { type: "string" }
  },
  required: ["name", "visualTreatment", "meaning", "continuity"],
  additionalProperties: false
} as const;

export const creativeLanguageJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    governingIdea: { type: "string" },
    visualAesthetic: { type: "string" },
    colorSystem: { type: "string" },
    materialsAndTexture: { type: "string" },
    lightingGrammar: { type: "string" },
    compositionGrammar: { type: "string" },
    cinematographyGrammar: { type: "string" },
    cameraMotionGrammar: { type: "string" },
    subjectMotionGrammar: { type: "string" },
    performanceGrammar: { type: "string" },
    editingGrammar: { type: "string" },
    transitionGrammar: { type: "string" },
    pacingCurve: { type: "string" },
    worldRules: { type: "string" },
    continuityRules: { type: "string" },
    typographyAndGraphics: { type: "string" },
    characters: { type: "array", items: characterJson },
    locations: { type: "array", items: locationJson },
    wardrobe: { type: "array", items: wardrobeJson },
    motifsAndProps: { type: "array", items: motifJson },
    positiveGenerationLanguage: { type: "array", items: { type: "string" } },
    negativeGenerationLanguage: { type: "array", items: { type: "string" } },
    hardExclusions: { type: "array", items: { type: "string" } },
    notes: { type: "string" }
  },
  required: [
    "title","governingIdea","visualAesthetic","colorSystem","materialsAndTexture",
    "lightingGrammar","compositionGrammar","cinematographyGrammar","cameraMotionGrammar",
    "subjectMotionGrammar","performanceGrammar","editingGrammar","transitionGrammar",
    "pacingCurve","worldRules","continuityRules","typographyAndGraphics","characters",
    "locations","wardrobe","motifsAndProps","positiveGenerationLanguage",
    "negativeGenerationLanguage","hardExclusions","notes"
  ],
  additionalProperties: false
} as const;
