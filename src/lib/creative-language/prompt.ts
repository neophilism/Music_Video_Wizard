import type { TreatmentDocument } from "@/lib/treatment/schema";

export function buildCreativeLanguagePrompt(input: {
  projectTitle: string;
  treatment: TreatmentDocument;
  direction: string;
}) {
  return {
    system: [
      "You are defining the reusable creative language for a professional music video.",
      "The locked Treatment is authoritative.",
      "Translate the Treatment into project-wide visual and editorial rules, not shots.",
      "Rules must be specific enough to preserve continuity across later storyboard and generation stages.",
      "Do not invent a new story or contradict the Treatment.",
      "Do not describe individual shot timings.",
      "Return strict JSON matching the supplied schema."
    ].join("\n"),
    prompt: JSON.stringify({
      projectTitle: input.projectTitle,
      lockedTreatment: input.treatment,
      additionalDirection: input.direction || null,
      requirements: [
        "Define visual aesthetic, color, materials, lighting, composition, cinematography, camera motion, subject motion, performance, editing, transitions, pacing, world and continuity rules.",
        "Extract recurring characters, locations, wardrobe, motifs and props when the Treatment supports them.",
        "Provide reusable positive generation language and explicit negative language/hard exclusions.",
        "Keep the rules provider-neutral; do not name a specific image or video model.",
        "This artifact will govern song-to-picture planning, storyboard, shot specifications, and later image/video generation."
      ]
    }, null, 2)
  };
}
