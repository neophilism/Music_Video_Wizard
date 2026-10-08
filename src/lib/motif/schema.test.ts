import { describe, expect, it } from "vitest";
import {
  EMPTY_MOTIF,
  motifCompletionIssues,
  parseMotifDefinition
} from "./schema";

describe("motif schema", () => {
  it("accepts a structured evolving motif", () => {
    const motif = {
      ...EMPTY_MOTIF,
      motifType: "LIGHT" as const,
      visualSignature: "A narrow amber shaft crossing otherwise cool frames.",
      semanticFunction: "Signals moments when the protagonist chooses agency.",
      introduction: "First appears barely visible in the opening verse.",
      recurrence: {
        mode: "ESCALATING" as const,
        cueGuidance: "Return at major lyrical decisions and the final release.",
        minimumOccurrences: 3,
        maximumOccurrences: 6
      },
      evolution: "The shaft broadens and warms with each recurrence.",
      variationRules: ["May move from background to subject key.", "Never change hue family."],
      prohibitedUses: ["Do not use as generic beauty light."]
    };
    expect(parseMotifDefinition(motif)).toEqual(motif);
    expect(motifCompletionIssues(motif)).toEqual([]);
  });

  it("keeps incomplete drafts valid while reporting missing semantics", () => {
    expect(parseMotifDefinition(EMPTY_MOTIF)).toEqual(EMPTY_MOTIF);
    expect(motifCompletionIssues(EMPTY_MOTIF)).toContain(
      "Describe when the motif should recur."
    );
  });

  it("rejects impossible recurrence bounds", () => {
    expect(() => parseMotifDefinition({
      ...EMPTY_MOTIF,
      recurrence: {
        ...EMPTY_MOTIF.recurrence,
        minimumOccurrences: 5,
        maximumOccurrences: 2
      }
    })).toThrow();
  });
});
