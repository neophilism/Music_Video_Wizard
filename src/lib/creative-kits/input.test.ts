import { describe, expect, it } from "vitest";
import {
  parseCreativeKitForm,
  parseCreativeKitVersionForm
} from "./input";

describe("Creative Kit input", () => {
  it("normalizes tags and parses exact slot bindings", () => {
    const form = new FormData();
    form.set("name", "Noir chase");
    form.set("description", "Reusable pursuit grammar");
    form.set("tags", "Noir, Chase, NOIR");
    form.set(
      "itemsJson",
      JSON.stringify([
        {
          slot: "visual-aesthetic",
          creativeModuleVersionId: "11111111-1111-4111-8111-111111111111"
        },
        {
          slot: "camera-motion",
          creativeModuleVersionId: "22222222-2222-4222-8222-222222222222"
        }
      ])
    );

    const parsed = parseCreativeKitForm(form);
    expect(parsed.metadata.tags).toEqual(["noir", "chase"]);
    expect(parsed.version.items).toHaveLength(2);
  });

  it("rejects duplicate slots", () => {
    const form = new FormData();
    form.set(
      "itemsJson",
      JSON.stringify([
        {
          slot: "visual-aesthetic",
          creativeModuleVersionId: "11111111-1111-4111-8111-111111111111"
        },
        {
          slot: "visual-aesthetic",
          creativeModuleVersionId: "22222222-2222-4222-8222-222222222222"
        }
      ])
    );

    expect(() => parseCreativeKitVersionForm(form)).toThrow();
  });

  it("rejects non-normalized slot names", () => {
    const form = new FormData();
    form.set(
      "itemsJson",
      JSON.stringify([
        {
          slot: "Visual Aesthetic",
          creativeModuleVersionId: "11111111-1111-4111-8111-111111111111"
        }
      ])
    );

    expect(() => parseCreativeKitVersionForm(form)).toThrow();
  });
});
