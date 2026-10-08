import { describe, expect, it } from "vitest";
import {
  EMPTY_TYPOGRAPHY_KIT,
  parseTypographyKitDefinition,
  typographyKitCompletionIssues
} from "./schema";

describe("typography kit schema", () => {
  it("accepts a structured title system", () => {
    const kit = {
      ...EMPTY_TYPOGRAPHY_KIT,
      roles: [
        {
          role: "TITLE" as const,
          label: "Primary title",
          fontFamily: "Condensed grotesk display face",
          fallbackFamily: "Arial Narrow, sans-serif",
          weight: "700",
          style: "upright",
          casing: "UPPERCASE" as const,
          tracking: "0.08em",
          lineHeight: "0.92",
          alignment: "CENTER" as const,
          maxLines: 2,
          notes: "Short titles only."
        }
      ],
      placement: "Centered unless picture action requires lower-third displacement.",
      colorSystem: "Warm white over dark picture; near-black over light picture.",
      motion: "Static by default; restrained scale-in only for section openings.",
      timing: "Enter on phrase boundaries and clear before the next lyric phrase."
    };
    expect(parseTypographyKitDefinition(kit)).toEqual(kit);
    expect(typographyKitCompletionIssues(kit)).toEqual([]);
  });

  it("reports useful completion issues for drafts", () => {
    expect(parseTypographyKitDefinition(EMPTY_TYPOGRAPHY_KIT)).toEqual(
      EMPTY_TYPOGRAPHY_KIT
    );
    expect(typographyKitCompletionIssues(EMPTY_TYPOGRAPHY_KIT)).toContain(
      "Add at least one typography role."
    );
  });
});
