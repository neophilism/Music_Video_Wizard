import { describe, expect, it } from "vitest";
import { normalizeProgress } from "./progress";

describe("normalizeProgress", () => {
  it("rounds and clamps progress", () => {
    expect(normalizeProgress(50.4)).toBe(50);
    expect(normalizeProgress(-12)).toBe(0);
    expect(normalizeProgress(144)).toBe(100);
  });

  it("rejects non-finite progress", () => {
    expect(() => normalizeProgress(Number.NaN)).toThrow(/finite/);
  });
});
