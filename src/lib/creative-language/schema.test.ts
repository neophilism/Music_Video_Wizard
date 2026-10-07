import { describe, expect, it } from "vitest";
import {
  creativeLanguageCompletionIssues,
  creativeLanguageDocumentSchema,
  creativeLanguageDraftSchema,
  EMPTY_CREATIVE_LANGUAGE
} from "./schema";

describe("Creative Language schema", () => {
  it("allows an honest empty draft", () => {
    expect(
      creativeLanguageDraftSchema.parse(EMPTY_CREATIVE_LANGUAGE)
    ).toEqual(EMPTY_CREATIVE_LANGUAGE);
  });

  it("does not allow an empty draft to be completed", () => {
    expect(
      creativeLanguageCompletionIssues(EMPTY_CREATIVE_LANGUAGE)
        .length
    ).toBeGreaterThan(0);
  });

  it("accepts a complete reusable project-wide language", () => {
    const document = {
      title: "Open Threshold Grammar",
      governingIdea:
        "Containment gradually gives way to permeability and shared space.",
      visualAesthetic:
        "Tactile urban realism with deliberate graphic restraint.",
      colorSystem:
        "Cool compressed neutrals open toward warmer natural color.",
      materialsAndTexture:
        "Concrete, oxidized metal, worn fabric, glass and weathered paint.",
      lightingGrammar:
        "Motivated practical light early; broader available light after release.",
      compositionGrammar:
        "Frames begin boxed and axial, then widen and allow negative space.",
      cinematographyGrammar:
        "Observational lensing with controlled perspective and no gratuitous distortion.",
      cameraMotionGrammar:
        "Mostly locked or restrained movement until structural releases earn traversal.",
      subjectMotionGrammar:
        "Characters move cautiously at first, then commit to longer trajectories.",
      performanceGrammar:
        "Performance is grounded, direct and physically integrated with the world.",
      editingGrammar:
        "Cuts follow structural change and dramatic cause rather than decorative beat matching.",
      transitionGrammar:
        "Prefer motivated match cuts, occlusions and directional continuations.",
      pacingCurve:
        "Longer holds early, tightening through pressure, then opening into sustained release.",
      worldRules:
        "Architecture always communicates whether a space constrains or enables movement.",
      continuityRules:
        "Direction of travel, wardrobe state, motif state and spatial logic must remain explicit.",
      typographyAndGraphics:
        "No decorative on-screen text; graphics only when narratively necessary.",
      characters: [
        {
          name: "Lead",
          identity: "Observer who becomes participant.",
          appearance: "Naturalistic, specific and consistent.",
          performance: "Contained physicality that expands over time.",
          continuity: "Maintain identifiable wardrobe and direction of travel."
        }
      ],
      locations: [
        {
          name: "Threshold world",
          visualRules: "Doorways and passages dominate spatial organization.",
          evolution: "Spaces become wider and more porous.",
          continuity: "Geography must remain legible across transitions."
        }
      ],
      wardrobe: [
        {
          name: "Lead base wardrobe",
          appliesTo: "Lead",
          description: "Simple textured layers with no logos.",
          continuity: "Changes only at an explicit dramatic transition."
        }
      ],
      motifsAndProps: [
        {
          name: "Open doorway",
          visualTreatment: "Repeated as a changing spatial condition.",
          meaning: "Possibility and voluntary crossing.",
          continuity: "Its state must track the dramatic progression."
        }
      ],
      positiveGenerationLanguage: [
        "tactile natural materials",
        "motivated practical lighting",
        "controlled cinematic composition"
      ],
      negativeGenerationLanguage: [
        "generic glossy music-video lighting",
        "unmotivated lens distortion"
      ],
      hardExclusions: ["No nightclub cliches"],
      notes: ""
    };

    expect(
      creativeLanguageDocumentSchema.parse(document).characters
    ).toHaveLength(1);
    expect(creativeLanguageCompletionIssues(document)).toEqual([]);
  });
});
