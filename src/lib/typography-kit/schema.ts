import { z } from "zod";

export const typographyRoleValues = [
  "TITLE",
  "SECTION",
  "LYRIC",
  "LOWER_THIRD",
  "CAPTION",
  "CREDIT",
  "OTHER"
] as const;

export const typographyCaseValues = [
  "AS_TYPED",
  "UPPERCASE",
  "LOWERCASE",
  "TITLE_CASE"
] as const;

export const typographyAlignmentValues = [
  "LEFT",
  "CENTER",
  "RIGHT",
  "JUSTIFIED"
] as const;

const text = z.string().trim().max(5000);
const token = z.string().trim().min(1).max(200);

export const typographyRoleSchema = z.object({
  role: z.enum(typographyRoleValues),
  label: token,
  fontFamily: text,
  fallbackFamily: text,
  weight: text,
  style: text,
  casing: z.enum(typographyCaseValues),
  tracking: text,
  lineHeight: text,
  alignment: z.enum(typographyAlignmentValues),
  maxLines: z.number().int().min(1).max(20).nullable(),
  notes: text
}).strict();

export const typographyKitDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  roles: z.array(typographyRoleSchema).max(20),
  placement: text,
  safeArea: text,
  colorSystem: text,
  outlineShadow: text,
  texture: text,
  motion: text,
  entrance: text,
  exit: text,
  timing: text,
  compositing: text,
  accessibility: text,
  exclusions: z.array(token).max(30),
  providerHints: z.array(z.object({
    provider: token,
    settings: text.min(1)
  }).strict()).max(12)
}).strict();

export type TypographyKitDefinition = z.infer<
  typeof typographyKitDefinitionSchema
>;

export const EMPTY_TYPOGRAPHY_KIT: TypographyKitDefinition = {
  schemaVersion: 1,
  roles: [],
  placement: "",
  safeArea: "",
  colorSystem: "",
  outlineShadow: "",
  texture: "",
  motion: "",
  entrance: "",
  exit: "",
  timing: "",
  compositing: "",
  accessibility: "",
  exclusions: [],
  providerHints: []
};

export function parseTypographyKitDefinition(
  value: unknown
): TypographyKitDefinition {
  return typographyKitDefinitionSchema.parse(value);
}

export function typographyKitCompletionIssues(value: unknown): string[] {
  const parsed = typographyKitDefinitionSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);

  const kit = parsed.data;
  const issues: string[] = [];
  if (kit.roles.length === 0) issues.push("Add at least one typography role.");
  if (kit.roles.some((role) => !role.fontFamily)) {
    issues.push("Every typography role needs a font family or family description.");
  }
  if (!kit.placement) issues.push("Describe typography placement behavior.");
  if (!kit.colorSystem) issues.push("Describe the typography color system.");
  if (!kit.motion) issues.push("Describe typography motion behavior, including when text remains static.");
  if (!kit.timing) issues.push("Describe text timing relative to the music or picture.");
  return issues;
}
