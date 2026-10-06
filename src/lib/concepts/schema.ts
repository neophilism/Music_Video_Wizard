import { z } from "zod";

const shortLine = z.string().trim().min(1).max(320);
const paragraph = z.string().trim().min(1).max(6000);
const ratingSchema = z.enum(["STRONG", "MODERATE", "WEAK"]);

const alignmentSchema = z.object({
  rating: ratingSchema,
  rationale: z.string().trim().min(1).max(1600)
});

export const conceptContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  logline: z.string().trim().min(1).max(700),
  centralPremise: z.string().trim().min(1).max(3500),
  synopsis: paragraph,
  visualWorld: z.string().trim().min(1).max(4500),
  narrativeApproach: z.string().trim().min(1).max(4500),
  performanceApproach: z.string().trim().min(1).max(4500),
  abstractApproach: z.string().trim().min(1).max(4500),
  artistRole: z.string().trim().min(1).max(2600),
  relationshipToSong: z.string().trim().min(1).max(3500),
  emotionalArc: z.string().trim().min(1).max(3500),
  musicalArc: z.string().trim().min(1).max(3500),
  distinctiveImages: z.array(shortLine).min(3).max(10),
  recurringMotifs: z.array(shortLine).max(8),
  endingImage: z.string().trim().min(1).max(2600),
  productionLogic: z.string().trim().min(1).max(3500),
  strengths: z.array(shortLine).min(2).max(8),
  risks: z.array(shortLine).min(1).max(8),
  contrastStatement: z.string().trim().min(1).max(1600),
  briefAlignment: z.object({
    objective: alignmentSchema,
    emotion: alignmentSchema,
    form: alignmentSchema,
    imagery: alignmentSchema,
    constraints: alignmentSchema
  })
});

export type ConceptContent = z.infer<typeof conceptContentSchema>;

export const conceptEnvelopeSchema = z.object({
  concepts: z.array(conceptContentSchema).min(1).max(6)
});

export type ConceptEnvelope = z.infer<typeof conceptEnvelopeSchema>;

const alignmentJsonSchema = {
  type: "object",
  properties: {
    rating: {
      type: "string",
      enum: ["STRONG", "MODERATE", "WEAK"]
    },
    rationale: {
      type: "string"
    }
  },
  required: ["rating", "rationale"],
  additionalProperties: false
} as const;

export function conceptEnvelopeJsonSchema(_count: number) {
  const concept = {
    type: "object",
    properties: {
      title: { type: "string" },
      logline: { type: "string" },
      centralPremise: { type: "string" },
      synopsis: { type: "string" },
      visualWorld: { type: "string" },
      narrativeApproach: { type: "string" },
      performanceApproach: { type: "string" },
      abstractApproach: { type: "string" },
      artistRole: { type: "string" },
      relationshipToSong: { type: "string" },
      emotionalArc: { type: "string" },
      musicalArc: { type: "string" },
      distinctiveImages: {
        type: "array",
        items: { type: "string" }
      },
      recurringMotifs: {
        type: "array",
        items: { type: "string" }
      },
      endingImage: { type: "string" },
      productionLogic: { type: "string" },
      strengths: {
        type: "array",
        items: { type: "string" }
      },
      risks: {
        type: "array",
        items: { type: "string" }
      },
      contrastStatement: { type: "string" },
      briefAlignment: {
        type: "object",
        properties: {
          objective: alignmentJsonSchema,
          emotion: alignmentJsonSchema,
          form: alignmentJsonSchema,
          imagery: alignmentJsonSchema,
          constraints: alignmentJsonSchema
        },
        required: [
          "objective",
          "emotion",
          "form",
          "imagery",
          "constraints"
        ],
        additionalProperties: false
      }
    },
    required: [
      "title",
      "logline",
      "centralPremise",
      "synopsis",
      "visualWorld",
      "narrativeApproach",
      "performanceApproach",
      "abstractApproach",
      "artistRole",
      "relationshipToSong",
      "emotionalArc",
      "musicalArc",
      "distinctiveImages",
      "recurringMotifs",
      "endingImage",
      "productionLogic",
      "strengths",
      "risks",
      "contrastStatement",
      "briefAlignment"
    ],
    additionalProperties: false
  } as const;

  return {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: concept
      }
    },
    required: ["concepts"],
    additionalProperties: false
  } as const;
}
