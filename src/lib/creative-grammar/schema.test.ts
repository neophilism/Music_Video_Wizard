import { describe, expect, it } from "vitest";
import {
  creativeGrammarCompletionIssues,
  emptyCreativeGrammar,
  parseCreativeGrammarDefinition,
  parseCreativeGrammarDefinitionForKind
} from "./schema";
import { CreativeModuleKind } from "@prisma/client";

describe("creative grammar schema", () => {
  it("accepts a structured motion grammar", () => {
    const definition = {
      ...emptyCreativeGrammar("MOTION_GRAMMAR"),
      intent: "Movement should feel motivated by musical pressure, never decorative.",
      scope: "Project default with deliberate shot-level overrides.",
      rules: [
        {
          trigger: "default",
          directive: "Begin movement only when subject or music creates directional pressure.",
          strength: "MUST" as const,
          rationale: "Prevents arbitrary camera drift."
        }
      ],
      controls: {
        cameraMovement: "Handheld pursuit or restrained dolly; no aimless orbiting.",
        subjectMovement: "Subject initiates or resists the camera vector.",
        stability: "Controlled handheld with readable horizon.",
        speed: "Slow by default; accelerate only at musical peaks.",
        acceleration: "Ease into movement rather than instant velocity.",
        motivation: "Every move answers subject, reveal, lyric, or musical event.",
        startStopBehavior: "Land movement before the next editorial idea begins."
      }
    };

    expect(parseCreativeGrammarDefinition(definition)).toEqual(definition);
    expect(creativeGrammarCompletionIssues(definition)).toEqual([]);
  });

  it("keeps incomplete drafts valid while reporting completion issues", () => {
    const draft = emptyCreativeGrammar("EDITING_GRAMMAR");
    expect(parseCreativeGrammarDefinition(draft)).toEqual(draft);
    expect(creativeGrammarCompletionIssues(draft)).toContain(
      "Add at least one explicit rule."
    );
  });

  it("rejects a grammar whose module kind and definition kind disagree", () => {
    expect(() =>
      parseCreativeGrammarDefinitionForKind(
        CreativeModuleKind.MOTION_GRAMMAR,
        emptyCreativeGrammar("EDITING_GRAMMAR")
      )
    ).toThrow();
  });
});
