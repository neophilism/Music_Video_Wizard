import { describe, expect, it } from "vitest";
import { fingerprintJson } from "./fingerprint";

describe("fingerprintJson", () => {
  it("is stable across object key ordering", () => {
    expect(
      fingerprintJson({
        palette: "amber",
        camera: { lens: 50, movement: "locked" }
      })
    ).toBe(
      fingerprintJson({
        camera: { movement: "locked", lens: 50 },
        palette: "amber"
      })
    );
  });

  it("changes when a creative decision changes", () => {
    expect(fingerprintJson({ lens: 50 })).not.toBe(
      fingerprintJson({ lens: 85 })
    );
  });

  it("preserves array order because creative sequences are ordered", () => {
    expect(fingerprintJson(["wide", "close"])).not.toBe(
      fingerprintJson(["close", "wide"])
    );
  });
});
