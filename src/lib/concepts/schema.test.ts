import { describe, expect, it } from "vitest";
import {
  conceptContentSchema,
  conceptEnvelopeJsonSchema
} from "./schema";

const completeConcept = {
  title: "Threshold",
  logline: "A confined performance breaks into an impossible city-wide procession.",
  centralPremise: "Containment becomes liberation through a recurring threshold motif.",
  synopsis: "The artist begins in a controlled interior and progressively crosses boundaries until the final image opens into public space.",
  visualWorld: "Textured practical locations with restrained surreal transformations.",
  narrativeApproach: "A simple spatial journey carries the dramatic spine.",
  performanceApproach: "Performance appears at structural releases rather than continuously.",
  abstractApproach: "Architectural elements behave symbolically as the song opens up.",
  artistRole: "The artist is both performer and participant in the transformation.",
  relationshipToSong: "Images counterpoint verses and synchronize strongly at major structural releases.",
  emotionalArc: "Pressure, destabilization, wonder, release.",
  musicalArc: "The visual scale expands at each accepted musical anchor.",
  distinctiveImages: ["sealed room", "door opening onto sky", "street procession"],
  recurringMotifs: ["threshold", "red thread"],
  endingImage: "The artist steps through the final doorway into open daylight.",
  productionLogic: "A small number of controlled worlds expand through compositing and generated extensions.",
  strengths: ["clear emotional spine", "strong recurring image system"],
  risks: ["the threshold motif could become repetitive"],
  contrastStatement: "Unlike a pure performance concept, this relies on spatial transformation and narrative progression.",
  briefAlignment: {
    objective: { rating: "STRONG", rationale: "Directly serves the requested escalation and release." },
    emotion: { rating: "STRONG", rationale: "Tracks tension into liberation." },
    form: { rating: "STRONG", rationale: "Respects the requested narrative/performance/abstract balance." },
    imagery: { rating: "STRONG", rationale: "Uses required doorway imagery and avoids excluded imagery." },
    constraints: { rating: "STRONG", rationale: "Requires no on-screen text." }
  }
};

describe("concept schema", () => {
  it("accepts a complete concept", () => {
    expect(conceptContentSchema.parse(completeConcept).title).toBe("Threshold");
  });

  it("builds a strict structured-output schema", () => {
    const schema = conceptEnvelopeJsonSchema(4);
    expect(schema.properties.concepts.type).toBe("array");
    expect(schema.additionalProperties).toBe(false);
    expect(
      schema.properties.concepts.items.additionalProperties
    ).toBe(false);
  });
});
