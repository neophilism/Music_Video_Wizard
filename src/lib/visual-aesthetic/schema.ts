import { z } from "zod";

const text = z.string().trim().max(4000);
const token = z.string().trim().min(1).max(160);

export const visualAestheticRealismValues = [
  "ABSTRACT",
  "STYLIZED",
  "HEIGHTENED",
  "NATURALISTIC",
  "PHOTOREAL",
  "MIXED"
] as const;

export const visualAestheticSaturationValues = [
  "MONOCHROME",
  "MUTED",
  "RESTRAINED",
  "NATURAL",
  "RICH",
  "INTENSE",
  "SELECTIVE"
] as const;

export const visualAestheticContrastValues = [
  "FLAT",
  "SOFT",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRUSHED"
] as const;

export const visualAestheticPaletteEntrySchema = z.object({
  name: token,
  hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Palette colors must use six-digit hex values.")
}).strict();

export const visualAestheticDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  medium: text.min(1, "Medium is required."),
  realism: z.enum(visualAestheticRealismValues),
  movement: text,
  texture: text,
  colorTreatment: text,
  palette: z.array(visualAestheticPaletteEntrySchema).max(12),
  saturation: z.enum(visualAestheticSaturationValues),
  contrast: z.enum(visualAestheticContrastValues),
  grain: text,
  surfaceQualities: z.array(token).max(24),
  lighting: z.object({
    quality: text,
    direction: text,
    colorTemperature: text,
    practicals: text,
    shadowCharacter: text
  }).strict(),
  edgeTreatment: text,
  lensArtifacts: z.array(token).max(24),
  periodCharacteristics: text,
  renderingCharacteristics: text,
  previewAssetVersionId: z.string().uuid().nullable(),
  providerHints: z.array(z.object({
    provider: token,
    settings: text.min(1)
  }).strict()).max(12)
}).strict();

export type VisualAestheticDefinition = z.infer<typeof visualAestheticDefinitionSchema>;

export const EMPTY_VISUAL_AESTHETIC: VisualAestheticDefinition = {
  schemaVersion: 1,
  medium: "",
  realism: "STYLIZED",
  movement: "",
  texture: "",
  colorTreatment: "",
  palette: [],
  saturation: "NATURAL",
  contrast: "MEDIUM",
  grain: "",
  surfaceQualities: [],
  lighting: {
    quality: "",
    direction: "",
    colorTemperature: "",
    practicals: "",
    shadowCharacter: ""
  },
  edgeTreatment: "",
  lensArtifacts: [],
  periodCharacteristics: "",
  renderingCharacteristics: "",
  previewAssetVersionId: null,
  providerHints: []
};

export function parseVisualAestheticDefinition(value: unknown): VisualAestheticDefinition {
  return visualAestheticDefinitionSchema.parse(value);
}

export function visualAestheticCompletionIssues(value: unknown): string[] {
  const parsed = visualAestheticDefinitionSchema.safeParse(value);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message);
  }

  const definition = parsed.data;
  const issues: string[] = [];
  if (definition.palette.length === 0) issues.push("Add at least one palette color.");
  if (!definition.texture) issues.push("Describe the image texture.");
  if (!definition.colorTreatment) issues.push("Describe the color treatment.");
  if (!definition.lighting.quality) issues.push("Describe the lighting quality.");
  if (!definition.lighting.shadowCharacter) issues.push("Describe the shadow character.");
  if (!definition.renderingCharacteristics) issues.push("Describe the rendering characteristics.");
  return issues;
}
