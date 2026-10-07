import { describe, expect, it } from "vitest";
import {
  EMPTY_VISUAL_AESTHETIC,
  parseVisualAestheticDefinition,
  visualAestheticCompletionIssues
} from "./schema";

const complete = {
  ...EMPTY_VISUAL_AESTHETIC,
  medium: "35mm still-photography language translated into moving images",
  realism: "HEIGHTENED" as const,
  movement: "Composed stillness with directional blur only at emotional peaks.",
  texture: "Dense tactile blacks, visible emulsion texture, imperfect surfaces.",
  colorTreatment: "Cool neutrals punctured by oxidized amber practical light.",
  palette: [
    { name: "graphite", hex: "#22242A" },
    { name: "oxidized amber", hex: "#B36B2C" }
  ],
  saturation: "RESTRAINED" as const,
  contrast: "HIGH" as const,
  grain: "Persistent fine 35mm grain, never digital noise.",
  surfaceQualities: ["worn metal", "fogged glass"],
  lighting: {
    quality: "Hard motivated pools against broad darkness.",
    direction: "Mostly side and rear three-quarter.",
    colorTemperature: "Cool ambient field with warm practical islands.",
    practicals: "Visible sodium and tungsten sources may motivate key light.",
    shadowCharacter: "Long, legible, dense shadows with detail retained."
  },
  edgeTreatment: "Slight halation on bright practicals; otherwise crisp silhouettes.",
  lensArtifacts: ["subtle halation", "rare veiling flare"],
  periodCharacteristics: "Contemporary world photographed with late-1970s restraint.",
  renderingCharacteristics: "Photochemical density, restrained highlight rolloff.",
  providerHints: [{ provider: "generic-video", settings: "Preserve grain and shadow density." }]
};

describe("visual aesthetic schema", () => {
  it("accepts a complete structured reusable aesthetic", () => {
    expect(parseVisualAestheticDefinition(complete)).toEqual(complete);
    expect(visualAestheticCompletionIssues(complete)).toEqual([]);
  });

  it("rejects invalid palette colors", () => {
    expect(() => parseVisualAestheticDefinition({
      ...complete,
      palette: [{ name: "bad", hex: "red" }]
    })).toThrow();
  });

  it("reports meaningful incompleteness without requiring provider hints or references", () => {
    const issues = visualAestheticCompletionIssues(EMPTY_VISUAL_AESTHETIC);
    expect(issues).toContain("Add at least one palette color.");
    expect(issues).toContain("Describe the image texture.");
    expect(issues).toContain("Describe the lighting quality.");
  });
});
