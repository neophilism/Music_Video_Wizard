import { z } from "zod";

export const generationMediaKindSchema=z.enum(["IMAGE","VIDEO"]);

export const compiledGenerationRequestSchema=z.object({
  schemaVersion:z.literal(1),
  mediaKind:generationMediaKindSchema,
  sourceShotSpecificationVersionId:z.string().uuid(),
  sourceStoryboardShotVersionId:z.string().uuid(),
  editorialDurationMs:z.number().int().positive(),
  generationDurationMs:z.number().int().positive(),
  aspectRatio:z.string().trim().min(1).max(32),
  frameRate:z.number().int().min(1).max(240),
  prompt:z.string().trim().min(1).max(30000),
  negativeConstraints:z.array(z.string().trim().min(1).max(1500)).max(64),
  referenceRequirements:z.array(z.object({
    role:z.enum(["SUBJECT","WARDROBE","PROP","ENVIRONMENT","STYLE","FIRST_FRAME","LAST_FRAME"]),
    required:z.boolean(),
    description:z.string().trim().min(1).max(2000)
  }).strict()).max(64),
  capabilityRequirements:z.object({
    textToImage:z.boolean(),
    imageEditing:z.boolean(),
    imageToVideo:z.boolean(),
    referenceImages:z.boolean(),
    firstFrame:z.boolean(),
    lastFrame:z.boolean(),
    minDurationMs:z.number().int().min(0),
    maxDurationMs:z.number().int().positive()
  }).strict(),
  requestFingerprintInput:z.object({
    sourceShotSpecificationVersionId:z.string().uuid(),
    sourceStoryboardShotVersionId:z.string().uuid(),
    mediaKind:generationMediaKindSchema,
    editorialDurationMs:z.number().int().positive(),
    generationDurationMs:z.number().int().positive(),
    aspectRatio:z.string().trim().min(1).max(32),
    frameRate:z.number().int().min(1).max(240),
    prompt:z.string().trim().min(1).max(30000),
    negativeConstraints:z.array(z.string().trim().min(1).max(1500)).max(64)
  }).strict()
}).strict();

export type CompiledGenerationRequest=z.infer<typeof compiledGenerationRequestSchema>;
export type GenerationMediaKind=z.infer<typeof generationMediaKindSchema>;
