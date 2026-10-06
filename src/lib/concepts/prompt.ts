import type { CreativeBriefDraft } from "@/lib/creative-brief/input";
import type { ConceptContent } from "./schema";

export interface ConceptPromptContext {
  projectTitle: string;
  creativeBrief: CreativeBriefDraft;
  musicMap: {
    versionNumber: number;
    durationMs: number;
    tempoBpm: number | null;
    meter: string;
    acceptedAnchors: Array<{
      kind: string;
      label: string;
      startMs: number;
      endMs: number | null;
    }>;
  };
}

export interface ConceptPromptInput {
  operation: "generate" | "revise" | "combine";
  count: number;
  direction: string;
  parents: ConceptContent[];
  context: ConceptPromptContext;
}

const SYSTEM_PROMPT = `
You develop complete music-video concepts for a professional production workflow.

The Creative Brief and approved Music Map supplied by the user are governing constraints, not suggestions. Do not replace their objectives, exclusions, form balance, artist-presence decision, emotional target, or visual relationship to the song with your own preferences.

Return complete concepts, not shot lists and not treatments. Each concept must be specific enough to compare meaningfully yet leave detailed treatment, creative-language, storyboard, and shot design for later stages.

Prioritize:
- a memorable central premise;
- strong replay value and iconic visual potential;
- emotional logic across the whole song;
- a clear relationship to the approved musical structure;
- practical production logic for generated and/or photographed imagery;
- meaningful distinction between alternatives;
- explicit acknowledgment of weaknesses and risks.

Do not claim that your brief-alignment assessment is objective. It is an analytic explanation of how the proposed concept appears to fit the user's brief.

Never silently violate a required image or constraint. If a direction supplied for this generation conflicts with the locked brief, obey the locked brief.
`.trim();

export function buildConceptPrompt(input: ConceptPromptInput) {
  const common = {
    projectTitle: input.context.projectTitle,
    creativeBrief: input.context.creativeBrief,
    musicMap: input.context.musicMap
  };

  if (input.operation === "generate") {
    return {
      system: SYSTEM_PROMPT,
      prompt: [
        `Generate exactly ${input.count} genuinely different complete music-video concepts.`,
        "Do not make them superficial variations of one premise. Vary dramatic engine, visual world, relationship to performance, and metaphorical mechanism while honoring the same locked brief.",
        input.direction
          ? "Additional user direction for this batch:\n" + input.direction
          : "No additional batch direction was supplied.",
        "Project context (authoritative JSON):",
        JSON.stringify(common, null, 2),
        "For contrastStatement, explain what makes each option meaningfully different from the other options in this batch."
      ].join("\n\n")
    };
  }

  if (input.operation === "revise") {
    return {
      system: SYSTEM_PROMPT,
      prompt: [
        "Create exactly one revised concept.",
        "Preserve the useful identity of the source concept while making the requested change substantially and coherently. Do not merely append the instruction to the synopsis.",
        "User revision instruction:\n" + input.direction,
        "Source concept:",
        JSON.stringify(input.parents[0], null, 2),
        "Project context (authoritative JSON):",
        JSON.stringify(common, null, 2)
      ].join("\n\n")
    };
  }

  return {
    system: SYSTEM_PROMPT,
    prompt: [
      "Create exactly one new concept that deliberately combines the strongest compatible ideas from the supplied parent concepts.",
      "The result must be a coherent new concept, not a list or collage of the parents. Resolve contradictions using the locked Creative Brief as the authority.",
      input.direction
        ? "User combination instruction:\n" + input.direction
        : "No additional combination instruction was supplied.",
      "Parent concepts:",
      JSON.stringify(input.parents, null, 2),
      "Project context (authoritative JSON):",
      JSON.stringify(common, null, 2)
    ].join("\n\n")
  };
}
