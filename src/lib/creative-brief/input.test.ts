import { describe, expect, it } from "vitest";
import {
  creativeBriefCompletionIssues,
  creativeBriefDraftSchema,
  EMPTY_CREATIVE_BRIEF
} from "./input";

describe("creative brief input", () => {
  it("keeps creative choices unselected in a new draft", () => {
    const parsed = creativeBriefDraftSchema.parse(EMPTY_CREATIVE_BRIEF);

    expect(parsed.literalMetaphoricalMode).toBeNull();
    expect(parsed.artistPresence).toBeNull();
    expect(parsed.visualDialogueMode).toBeNull();
    expect(parsed.contentMix).toEqual({
      narrative: 0,
      performance: 0,
      abstract: 0
    });
  });

  it("requires the governing decisions before completion", () => {
    const issues = creativeBriefCompletionIssues(EMPTY_CREATIVE_BRIEF);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(" ")).toMatch(/objective/i);
    expect(issues.join(" ")).toMatch(/100%/);
  });

  it("accepts a complete user-authored brief", () => {
    const draft = creativeBriefDraftSchema.parse({
      ...EMPTY_CREATIVE_BRIEF,
      objective: "Create a tense but ultimately liberating visual argument.",
      audience: "Adults who reward close visual attention.",
      desiredFeelings: ["tension", "release"],
      tone: ["serious", "kinetic"],
      contentMix: {
        narrative: 50,
        performance: 30,
        abstract: 20
      },
      literalMetaphoricalMode: "MOSTLY_METAPHORICAL",
      artistPresence: "PERFORMANCE",
      visualDialogueMode: "COUNTERPOINT",
      evolution: "Begin contained, fracture at the midpoint, then open out.",
      endingResolution: "Resolve on an earned image of release."
    });

    expect(creativeBriefCompletionIssues(draft)).toEqual([]);
  });
});
