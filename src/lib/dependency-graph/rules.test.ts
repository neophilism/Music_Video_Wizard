import { describe, expect, it } from "vitest";
import { DomainVersionKind } from "@prisma/client";
import { impactActionForKind } from "./rules";

describe("impactActionForKind", () => {
  it.each([
    DomainVersionKind.ASSET,
    DomainVersionKind.MUSIC_ANALYSIS
  ])("regenerates derived node %s", (kind) => {
    expect(impactActionForKind(kind)).toBe("REGENERATE");
  });

  it("recompiles timelines", () => {
    expect(impactActionForKind(DomainVersionKind.TIMELINE)).toBe("RECOMPILE");
  });

  it.each([
    DomainVersionKind.PROJECT,
    DomainVersionKind.SEQUENCE,
    DomainVersionKind.SHOT,
    DomainVersionKind.CREATIVE_MODULE,
    DomainVersionKind.CREATIVE_KIT,
    DomainVersionKind.MUSIC_MAP,
    DomainVersionKind.CREATIVE_BRIEF
  ])("marks semantic node %s for review", (kind) => {
    expect(impactActionForKind(kind)).toBe("REVIEW");
  });
});
