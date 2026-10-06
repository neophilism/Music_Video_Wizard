import { DomainVersionKind } from "@prisma/client";
import type {
  CreativeBindingCandidate,
  CreativeInheritanceResolution,
  CreativeInheritanceScope,
  ResolvedCreativeBinding
} from "./types";

const SUPPORTED_SCOPE_KINDS = new Set<DomainVersionKind>([
  DomainVersionKind.PROJECT,
  DomainVersionKind.SEQUENCE,
  DomainVersionKind.SHOT
]);

export class CreativeInheritanceError extends Error {}

export function normalizeCreativeSlot(slot: string): string {
  const normalized = slot.trim();

  if (!/^[a-z0-9][a-z0-9:_-]{0,127}$/.test(normalized)) {
    throw new CreativeInheritanceError(
      "Creative binding slots must be 1-128 lowercase characters using letters, numbers, colon, underscore, or hyphen."
    );
  }

  return normalized;
}

export function assertSupportedCreativeScopeKind(
  kind: DomainVersionKind
): asserts kind is
  | DomainVersionKind.PROJECT
  | DomainVersionKind.SEQUENCE
  | DomainVersionKind.SHOT {
  if (!SUPPORTED_SCOPE_KINDS.has(kind)) {
    throw new CreativeInheritanceError(
      "Creative inheritance does not support scope kind " + kind + "."
    );
  }
}

export function resolveCreativeBindingCandidates(
  scopes: CreativeInheritanceScope[],
  candidates: CreativeBindingCandidate[]
): CreativeInheritanceResolution {
  if (scopes.length === 0) {
    throw new CreativeInheritanceError(
      "Creative inheritance requires at least one scope."
    );
  }

  const scopeIndexByNodeId = new Map<string, number>();
  scopes.forEach((scope, index) => {
    assertSupportedCreativeScopeKind(scope.kind);

    if (scopeIndexByNodeId.has(scope.nodeId)) {
      throw new CreativeInheritanceError(
        "Creative inheritance scope node appears more than once: " +
          scope.nodeId
      );
    }

    scopeIndexByNodeId.set(scope.nodeId, index);
  });

  const seenSlotAtScope = new Set<string>();
  const candidatesBySlot = new Map<string, CreativeBindingCandidate[]>();

  for (const candidate of candidates) {
    const scopeIndex = scopeIndexByNodeId.get(candidate.scopeNodeId);
    if (scopeIndex === undefined) {
      throw new CreativeInheritanceError(
        "Creative binding " +
          candidate.bindingId +
          " references a scope outside the requested inheritance chain."
      );
    }

    const slot = normalizeCreativeSlot(candidate.slot);
    const duplicateKey = candidate.scopeNodeId + ":" + slot;
    if (seenSlotAtScope.has(duplicateKey)) {
      throw new CreativeInheritanceError(
        "More than one creative binding exists for slot " +
          slot +
          " at scope " +
          candidate.scopeNodeId +
          "."
      );
    }
    seenSlotAtScope.add(duplicateKey);

    const normalizedCandidate =
      slot === candidate.slot ? candidate : { ...candidate, slot };
    const list = candidatesBySlot.get(slot) ?? [];
    list.push(normalizedCandidate);
    candidatesBySlot.set(slot, list);
  }

  const bindings: ResolvedCreativeBinding[] = [];

  for (const [slot, slotCandidates] of candidatesBySlot) {
    slotCandidates.sort(
      (left, right) =>
        scopeIndexByNodeId.get(left.scopeNodeId)! -
        scopeIndexByNodeId.get(right.scopeNodeId)!
    );

    const selected = slotCandidates[slotCandidates.length - 1]!;
    const selectedScope =
      scopes[scopeIndexByNodeId.get(selected.scopeNodeId)!]!;

    bindings.push({
      ...selected,
      slot,
      sourceScope: selectedScope,
      shadowed: slotCandidates.slice(0, -1).map((candidate) => ({
        ...candidate,
        sourceScope:
          scopes[scopeIndexByNodeId.get(candidate.scopeNodeId)!]!
      }))
    });
  }

  bindings.sort((left, right) => left.slot.localeCompare(right.slot));

  return {
    scopes: [...scopes],
    bindings
  };
}
