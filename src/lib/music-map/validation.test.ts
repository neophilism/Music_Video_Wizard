import { describe, expect, it } from "vitest";
import {
  musicMapAnchorCreateSchema,
  musicMapGridPatchSchema
} from "./input";

describe("music map input", () => {
  it("accepts a manual meter/grid correction", () => {
    const parsed = musicMapGridPatchSchema.parse({
      mapVersionId: "00000000-0000-4000-8000-000000000001",
      expectedRevision: 3,
      mode: "manual-tempo",
      tempoBpm: 128,
      meterNumerator: 3,
      meterDenominator: 4,
      beatOffsetMs: 250,
      barPhase: 1
    });

    expect(parsed.tempoBpm).toBe(128);
    expect(parsed.meterNumerator).toBe(3);
  });

  it("rejects an inverted custom range at service validation time but accepts nullable point end", () => {
    const parsed = musicMapAnchorCreateSchema.parse({
      mapVersionId: "00000000-0000-4000-8000-000000000001",
      expectedRevision: 0,
      kind: "CUSTOM",
      label: "Visual hit",
      startMs: 12000,
      endMs: null
    });

    expect(parsed.endMs).toBeNull();
  });
});
