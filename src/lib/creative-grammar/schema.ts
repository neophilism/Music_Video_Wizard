import { CreativeModuleKind } from "@prisma/client";
import { z } from "zod";

export const creativeGrammarKinds = [
  "CINEMATOGRAPHY_GRAMMAR",
  "COMPOSITION_GRAMMAR",
  "MOTION_GRAMMAR",
  "PERFORMANCE_GRAMMAR",
  "EDITING_GRAMMAR",
  "TRANSITION_GRAMMAR"
] as const;

export type CreativeGrammarKind = (typeof creativeGrammarKinds)[number];

export const grammarRuleStrengthValues = [
  "MUST",
  "PREFER",
  "MAY",
  "AVOID",
  "NEVER"
] as const;

const text = z.string().trim().max(5000);
const token = z.string().trim().min(1).max(200);

const ruleSchema = z.object({
  trigger: text,
  directive: text,
  strength: z.enum(grammarRuleStrengthValues),
  rationale: text
}).strict();

const providerHintSchema = z.object({
  provider: token,
  settings: text.min(1)
}).strict();

const shared = {
  schemaVersion: z.literal(1),
  intent: text,
  scope: text,
  rules: z.array(ruleSchema).max(40),
  continuity: text,
  exceptions: z.array(token).max(30),
  providerHints: z.array(providerHintSchema).max(12)
};

const cinematographySchema = z.object({
  ...shared,
  grammarKind: z.literal("CINEMATOGRAPHY_GRAMMAR"),
  controls: z.object({
    lensFamily: text,
    focalLengthBehavior: text,
    depthOfField: text,
    focusBehavior: text,
    exposureBehavior: text,
    cameraHeight: text,
    cameraAngle: text
  }).strict()
}).strict();

const compositionSchema = z.object({
  ...shared,
  grammarKind: z.literal("COMPOSITION_GRAMMAR"),
  controls: z.object({
    subjectPlacement: text,
    negativeSpace: text,
    symmetry: text,
    depthLayering: text,
    headroom: text,
    leadRoom: text,
    horizonBehavior: text
  }).strict()
}).strict();

const motionSchema = z.object({
  ...shared,
  grammarKind: z.literal("MOTION_GRAMMAR"),
  controls: z.object({
    cameraMovement: text,
    subjectMovement: text,
    stability: text,
    speed: text,
    acceleration: text,
    motivation: text,
    startStopBehavior: text
  }).strict()
}).strict();

const performanceSchema = z.object({
  ...shared,
  grammarKind: z.literal("PERFORMANCE_GRAMMAR"),
  controls: z.object({
    presence: text,
    facialExpression: text,
    bodyLanguage: text,
    eyeline: text,
    choreography: text,
    lipSync: text,
    interaction: text
  }).strict()
}).strict();

const editingSchema = z.object({
  ...shared,
  grammarKind: z.literal("EDITING_GRAMMAR"),
  controls: z.object({
    cutLogic: text,
    shotDuration: text,
    rhythmicRelationship: text,
    continuity: text,
    montage: text,
    repetition: text,
    timeManipulation: text
  }).strict()
}).strict();

const transitionSchema = z.object({
  ...shared,
  grammarKind: z.literal("TRANSITION_GRAMMAR"),
  controls: z.object({
    defaultTransition: text,
    matchRules: text,
    temporalBridges: text,
    graphicalBridges: text,
    audioLedTransitions: text,
    prohibitedTransitions: text
  }).strict()
}).strict();

export const creativeGrammarDefinitionSchema = z.discriminatedUnion(
  "grammarKind",
  [
    cinematographySchema,
    compositionSchema,
    motionSchema,
    performanceSchema,
    editingSchema,
    transitionSchema
  ]
);

export type CreativeGrammarDefinition = z.infer<
  typeof creativeGrammarDefinitionSchema
>;

function blankControls(kind: CreativeGrammarKind): Record<string, string> {
  switch (kind) {
    case "CINEMATOGRAPHY_GRAMMAR":
      return {
        lensFamily: "",
        focalLengthBehavior: "",
        depthOfField: "",
        focusBehavior: "",
        exposureBehavior: "",
        cameraHeight: "",
        cameraAngle: ""
      };
    case "COMPOSITION_GRAMMAR":
      return {
        subjectPlacement: "",
        negativeSpace: "",
        symmetry: "",
        depthLayering: "",
        headroom: "",
        leadRoom: "",
        horizonBehavior: ""
      };
    case "MOTION_GRAMMAR":
      return {
        cameraMovement: "",
        subjectMovement: "",
        stability: "",
        speed: "",
        acceleration: "",
        motivation: "",
        startStopBehavior: ""
      };
    case "PERFORMANCE_GRAMMAR":
      return {
        presence: "",
        facialExpression: "",
        bodyLanguage: "",
        eyeline: "",
        choreography: "",
        lipSync: "",
        interaction: ""
      };
    case "EDITING_GRAMMAR":
      return {
        cutLogic: "",
        shotDuration: "",
        rhythmicRelationship: "",
        continuity: "",
        montage: "",
        repetition: "",
        timeManipulation: ""
      };
    case "TRANSITION_GRAMMAR":
      return {
        defaultTransition: "",
        matchRules: "",
        temporalBridges: "",
        graphicalBridges: "",
        audioLedTransitions: "",
        prohibitedTransitions: ""
      };
  }
}

export function emptyCreativeGrammar(
  kind: CreativeGrammarKind
): CreativeGrammarDefinition {
  return creativeGrammarDefinitionSchema.parse({
    schemaVersion: 1,
    grammarKind: kind,
    intent: "",
    scope: "",
    rules: [],
    continuity: "",
    exceptions: [],
    providerHints: [],
    controls: blankControls(kind)
  });
}

export function isCreativeGrammarModuleKind(
  kind: CreativeModuleKind
): kind is CreativeGrammarKind {
  return creativeGrammarKinds.includes(kind as CreativeGrammarKind);
}

export function parseCreativeGrammarDefinition(
  value: unknown
): CreativeGrammarDefinition {
  return creativeGrammarDefinitionSchema.parse(value);
}

export function parseCreativeGrammarDefinitionForKind(
  kind: CreativeModuleKind,
  value: unknown
): CreativeGrammarDefinition {
  if (!isCreativeGrammarModuleKind(kind)) {
    throw new Error("Creative module kind is not a grammar kind.");
  }
  const definition = parseCreativeGrammarDefinition(value);
  if (definition.grammarKind !== kind) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["grammarKind"],
        message: "Grammar definition kind must match the Creative Library item type."
      }
    ]);
  }
  return definition;
}

export function creativeGrammarCompletionIssues(value: unknown): string[] {
  const parsed = creativeGrammarDefinitionSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);

  const definition = parsed.data;
  const issues: string[] = [];
  if (!definition.intent) issues.push("Describe the grammar intent.");
  if (!definition.scope) issues.push("Describe where the grammar applies.");
  if (definition.rules.length === 0) issues.push("Add at least one explicit rule.");
  if (definition.rules.some((rule) => !rule.directive)) {
    issues.push("Every rule needs a directive.");
  }
  const controls = Object.values(definition.controls);
  if (!controls.some((value) => value.trim().length > 0)) {
    issues.push("Define at least one category-specific control.");
  }
  return issues;
}
