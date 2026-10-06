import {
  CreativeModuleKind,
  DomainVersionKind
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CreativeInheritanceError,
  normalizeCreativeSlot,
  resolveCreativeBindingCandidates
} from "./resolver";

const scopes = [
  {
    nodeId: "project-node",
    versionId: "project-version",
    kind: DomainVersionKind.PROJECT
  },
  {
    nodeId: "sequence-node",
    versionId: "sequence-version",
    kind: DomainVersionKind.SEQUENCE
  },
  {
    nodeId: "shot-node",
    versionId: "shot-version",
    kind: DomainVersionKind.SHOT
  }
];

function candidate(
  bindingId: string,
  scopeNodeId: string,
  slot: string,
  creativeModuleVersionId: string
) {
  return {
    bindingId,
    scopeNodeId,
    slot,
    creativeModuleVersionId,
    creativeModuleNodeId: creativeModuleVersionId + "-node",
    moduleKind: CreativeModuleKind.VISUAL_AESTHETIC,
    moduleName: creativeModuleVersionId,
    moduleVersionNumber: 1
  };
}

describe("creative inheritance resolver", () => {
  it("uses the narrowest binding and preserves shadowed provenance", () => {
    const result = resolveCreativeBindingCandidates(scopes, [
      candidate("p", "project-node", "visual-aesthetic", "project-style"),
      candidate("s", "sequence-node", "visual-aesthetic", "sequence-style"),
      candidate("c", "shot-node", "camera-motion", "shot-camera")
    ]);

    expect(result.bindings).toHaveLength(2);

    const visual = result.bindings.find(
      ({ slot }) => slot === "visual-aesthetic"
    )!;
    expect(visual.creativeModuleVersionId).toBe("sequence-style");
    expect(visual.sourceScope.kind).toBe(DomainVersionKind.SEQUENCE);
    expect(
      visual.shadowed.map(({ creativeModuleVersionId }) =>
        creativeModuleVersionId
      )
    ).toEqual(["project-style"]);

    const camera = result.bindings.find(
      ({ slot }) => slot === "camera-motion"
    )!;
    expect(camera.sourceScope.kind).toBe(DomainVersionKind.SHOT);
  });

  it("rejects a binding outside the requested scope chain", () => {
    expect(() =>
      resolveCreativeBindingCandidates(scopes, [
        candidate("x", "other-node", "visual-aesthetic", "style")
      ])
    ).toThrow(CreativeInheritanceError);
  });

  it("enforces deterministic slot names", () => {
    expect(normalizeCreativeSlot("character:lead")).toBe("character:lead");
    expect(() => normalizeCreativeSlot("Character Lead")).toThrow(
      CreativeInheritanceError
    );
  });
});
