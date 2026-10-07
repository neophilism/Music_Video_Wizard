import type { ConceptContent } from "@/lib/concepts/schema";
import type { CreativeBriefDraft } from "@/lib/creative-brief/input";

export function buildTreatmentPrompt(input: {
  projectTitle: string;
  concept: ConceptContent;
  creativeBrief: CreativeBriefDraft;
  durationMs: number;
  anchors: Array<{ label: string; kind: string; startMs: number; endMs: number | null }>;
  direction: string;
}) {
  return {
    system: [
      "You are developing a professional music-video treatment.",
      "The song is already finished and immutable.",
      "Expand the selected concept into a coherent treatment, not a shot list.",
      "Map the treatment across the song structure using the supplied timing anchors.",
      "Preserve the selected concept and locked creative brief as authority.",
      "Do not invent changes to the music.",
      "Use performance, narrative, and abstract material only where appropriate to the selected concept.",
      "Return strict JSON matching the supplied schema."
    ].join("\n"),
    prompt: JSON.stringify({
      projectTitle: input.projectTitle,
      durationMs: input.durationMs,
      creativeBrief: input.creativeBrief,
      selectedConcept: input.concept,
      acceptedMusicAnchors: input.anchors,
      additionalDirection: input.direction || null,
      requirements: [
        "Cover the full song from 0 to durationMs.",
        "Explain narrative, visual, character, performance, world, motif, reveal, and ending progression.",
        "Each section must have startMs and endMs and should align to meaningful musical structure.",
        "This treatment will feed later creative-language, song-to-picture, storyboard, and shot-specification stages."
      ]
    }, null, 2)
  };
}
