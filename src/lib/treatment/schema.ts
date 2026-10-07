import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

function sectionSchema(required: boolean) {
  const paragraph = required ? requiredText(7000) : text(7000);
  const shortLine = required ? requiredText(360) : text(360);
  return z.object({
    title: required ? requiredText(180) : text(180),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    musicAnchorLabels: z.array(shortLine).max(8),
    dramaticPurpose: paragraph,
    picturePlan: paragraph,
    narrativeProgression: paragraph,
    performancePlan: paragraph,
    visualProgression: paragraph,
    characterProgression: paragraph,
    worldChange: paragraph,
    motifs: z.array(shortLine).max(10),
    majorReveal: text(3000),
    transitionIntent: text(2200)
  }).refine((section) => section.endMs >= section.startMs, {
    message: "Treatment section end must not precede its start."
  });
}

export const treatmentSectionDraftSchema = sectionSchema(false);
export const treatmentSectionSchema = sectionSchema(true);

export const treatmentDraftSchema = z.object({
  title: text(220),
  thesis: text(7000),
  overview: text(7000),
  narrativeArc: text(7000),
  visualArc: text(7000),
  characterArc: text(7000),
  performanceStrategy: text(7000),
  worldEvolution: text(7000),
  motifStrategy: text(7000),
  revealStrategy: text(7000),
  ending: text(7000),
  sections: z.array(treatmentSectionDraftSchema).max(24)
});

export const treatmentDocumentSchema = z.object({
  title: requiredText(220),
  thesis: requiredText(7000),
  overview: requiredText(7000),
  narrativeArc: requiredText(7000),
  visualArc: requiredText(7000),
  characterArc: requiredText(7000),
  performanceStrategy: requiredText(7000),
  worldEvolution: requiredText(7000),
  motifStrategy: requiredText(7000),
  revealStrategy: requiredText(7000),
  ending: requiredText(7000),
  sections: z.array(treatmentSectionSchema).min(2).max(24)
});

export type TreatmentDraft = z.infer<typeof treatmentDraftSchema>;
export type TreatmentDocument = z.infer<typeof treatmentDocumentSchema>;

export const EMPTY_TREATMENT: TreatmentDraft = {
  title: "",
  thesis: "",
  overview: "",
  narrativeArc: "",
  visualArc: "",
  characterArc: "",
  performanceStrategy: "",
  worldEvolution: "",
  motifStrategy: "",
  revealStrategy: "",
  ending: "",
  sections: []
};

export function treatmentCompletionIssues(
  draft: TreatmentDraft,
  durationMs?: number
): string[] {
  const parsed = treatmentDocumentSchema.safeParse(draft);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => issue.message);
  }
  const sections = parsed.data.sections;
  if (sections[0]!.startMs !== 0) {
    return ["The treatment must begin at the start of the song."];
  }
  for (let index = 1; index < sections.length; index += 1) {
    const previous = sections[index - 1]!;
    const current = sections[index]!;
    if (current.startMs < previous.startMs) {
      return ["Treatment sections must be ordered by time."];
    }
    if (current.startMs !== previous.endMs) {
      return ["Treatment sections must cover the song continuously without gaps or overlaps."];
    }
  }
  if (
    durationMs !== undefined &&
    sections.at(-1)!.endMs !== durationMs
  ) {
    return ["The treatment must end exactly at the end of the finished song."];
  }
  return [];
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
