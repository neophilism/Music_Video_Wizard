import { CreativeModuleKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  parseCreativeModuleForm,
  parseCreativeVersionForm
} from "./input";

describe("Creative Library input", () => {
  it("normalizes tags and parses structured definition JSON", () => {
    const form = new FormData();
    form.set("kind", CreativeModuleKind.VISUAL_AESTHETIC);
    form.set("name", "Silver nitrate dream");
    form.set("description", "A monochrome visual system");
    form.set("tags", "Film, monochrome, FILM");
    form.set("definition", '{"grain":"heavy","contrast":"high"}');
    form.set("positivePrompt", "silver gelatin texture");

    const parsed = parseCreativeModuleForm(form);

    expect(parsed.metadata.tags).toEqual(["film", "monochrome"]);
    expect(parsed.version.definition).toEqual({
      grain: "heavy",
      contrast: "high"
    });
  });

  it("rejects non-object definitions", () => {
    const form = new FormData();
    form.set("definition", '["not","an","object"]');

    expect(() => parseCreativeVersionForm(form)).toThrow();
  });
});
