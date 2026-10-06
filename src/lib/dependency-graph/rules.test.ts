import { describe, expect, it } from "vitest";
import { DomainVersionKind } from "@prisma/client";
import { impactActionForKind } from "./rules";

describe("impactActionForKind", () => {
  it("regenerates derived media assets", () => {
    expect(impactActionForKind(DomainVersionKind.ASSET)).toBe("REGENERATE");
  });

  it("recompiles timelines", () => {
    expect(impactActionForKind(DomainVersionKind.TIMELINE)).toBe("RECOMPILE");
  });

  it.each([
    DomainVersionKind.PROJECT,
    DomainVersionKind.SEQUENCE,
    DomainVersionKind.SHOT,
    DomainVersionKind.CREATIVE_MODULE
  ])("marks semantic node %s for review", (kind) => {
    expect(impactActionForKind(kind)).toBe("REVIEW");
  });
});
