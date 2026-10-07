import { z } from "zod";

const paragraph = z.string().trim().min(1).max(7000);
const shortLine = z.string().trim().min(1).max(360);

export const treatmentSectionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(1),
  musicAnchorLabels: z.array(shortLine).max(8),
  dramaticPurpose: paragraph,
  picturePlan: paragraph,
  narrativeProgression: paragraph,
  performancePlan: paragraph,
  visualProgression: paragraph,
  characterProgression: paragraph,
  worldChange: paragraph,
  motifs: z.array(shortLine).max(10),
  majorReveal: z.string().trim().max(3000),
  transitionIntent: z.string().trim().max(2200)
}).refine((section) => section.endMs > section.startMs, {
  message: "Treatment section end must be after its start."
});

export const treatmentDocumentSchema = z.object({
  title: z.string().trim().min(1).max(220),
  thesis: paragraph,
  overview: paragraph,
  narrativeArc: paragraph,
  visualArc: paragraph,
  characterArc: paragraph,
  performanceStrategy: paragraph,
  worldEvolution: paragraph,
  motifStrategy: paragraph,
  revealStrategy: paragraph,
  ending: paragraph,
  sections: z.array(treatmentSectionSchema).min(2).max(24)
});

export type TreatmentDocument = z.infer<typeof treatmentDocumentSchema>;

export function treatmentCompletionIssues(document: TreatmentDocument): string[] {
  const issues: string[] = [];
  if (!document.sections.length) issues.push("Add at least one treatment section.");
  const sorted = [...document.sections].sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.startMs < sorted[i - 1]!.startMs) {
      issues.push("Treatment sections must be ordered by time.");
      break;
    }
  }
  return issues;
}

export const treatmentJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    thesis: { type: "string" },
    overview: { type: "string" },
    narrativeArc: { type: "string" },
    visualArc: { type: "string" },
    characterArc: { type: "string" },
    performanceStrategy: { type: "string" },
    worldEvolution: { type: "string" },
    motifStrategy: { type: "string" },
    revealStrategy: { type: "string" },
    ending: { type: "string" },
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 24,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          startMs: { type: "integer" },
          endMs: { type: "integer" },
          musicAnchorLabels: { type: "array", items: { type: "string" } },
          dramaticPurpose: { type: "string" },
          picturePlan: { type: "string" },
          narrativeProgression: { type: "string" },
          performancePlan: { type: "string" },
          visualProgression: { type: "string" },
          characterProgression: { type: "string" },
          worldChange: { type: "string" },
          motifs: { type: "array", items: { type: "string" } },
          majorReveal: { type: "string" },
          transitionIntent: { type: "string" }
        },
        required: ["title","startMs","endMs","musicAnchorLabels","dramaticPurpose","picturePlan","narrativeProgression","performancePlan","visualProgression","characterProgression","worldChange","motifs","majorReveal","transitionIntent"],
        additionalProperties: false
      }
    }
  },
  required: ["title","thesis","overview","narrativeArc","visualArc","characterArc","performanceStrategy","worldEvolution","motifStrategy","revealStrategy","ending","sections"],
  additionalProperties: false
} as const;
