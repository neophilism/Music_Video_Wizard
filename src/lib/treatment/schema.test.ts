import { describe, expect, it } from "vitest";
import {
  EMPTY_TREATMENT,
  treatmentCompletionIssues,
  treatmentDocumentSchema,
  treatmentDraftSchema
} from "./schema";

describe("Treatment schema", () => {
  it("allows an honest empty draft before generation", () => {
    expect(treatmentDraftSchema.parse(EMPTY_TREATMENT)).toEqual(EMPTY_TREATMENT);
  });

  it("requires a substantive complete treatment", () => {
    expect(treatmentCompletionIssues(EMPTY_TREATMENT).length).toBeGreaterThan(0);
  });

  it("accepts a complete song-mapped treatment", () => {
    const treatment = {
      title: "Open Door",
      thesis: "A contained world opens as the music earns release.",
      overview: "The video moves from confinement to a wider shared space.",
      narrativeArc: "A closed path becomes a deliberate crossing.",
      visualArc: "Frames widen and light becomes less controlled over time.",
      characterArc: "The central figure changes from observer to participant.",
      performanceStrategy: "Performance appears at structural pressure points.",
      worldEvolution: "Architecture begins rigid and gradually opens.",
      motifStrategy: "Doorways and red thread recur with changing meaning.",
      revealStrategy: "The apparent exit is revealed to be an entrance.",
      ending: "The final image holds on the now-open threshold.",
      sections: [
        {
          title: "Containment",
          startMs: 0,
          endMs: 30000,
          musicAnchorLabels: ["Opening"],
          dramaticPurpose: "Establish the emotional and spatial constraint.",
          picturePlan: "Keep the figure framed inside repeated architectural boundaries.",
          narrativeProgression: "The figure searches without yet crossing.",
          performancePlan: "Minimal direct performance.",
          visualProgression: "Tight compositions and restrained movement.",
          characterProgression: "Observation gives way to intent.",
          worldChange: "Small signs of permeability appear.",
          motifs: ["doorway", "red thread"],
          majorReveal: "",
          transitionIntent: "Cut on the structural release."
        },
        {
          title: "Release",
          startMs: 30000,
          endMs: 60000,
          musicAnchorLabels: ["Release"],
          dramaticPurpose: "Deliver the earned opening.",
          picturePlan: "Move into wider spaces and longer trajectories.",
          narrativeProgression: "The figure crosses and invites others through.",
          performancePlan: "Performance becomes physically integrated with the world.",
          visualProgression: "Frames widen and motion becomes expansive.",
          characterProgression: "Intent becomes participation.",
          worldChange: "Barriers become passages.",
          motifs: ["doorway", "red thread"],
          majorReveal: "The exit is actually an entrance into a shared space.",
          transitionIntent: "Resolve into a sustained final image."
        }
      ]
    };
    expect(treatmentDocumentSchema.parse(treatment).sections).toHaveLength(2);
    expect(treatmentCompletionIssues(treatment, 60000)).toEqual([]);
  });
});
