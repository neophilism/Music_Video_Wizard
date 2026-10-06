import { DomainVersionKind } from "@prisma/client";
import type { DependencyImpactAction } from "./types";

export function impactActionForKind(
  kind: DomainVersionKind
): DependencyImpactAction {
  switch (kind) {
    case DomainVersionKind.ASSET:
    case DomainVersionKind.MUSIC_ANALYSIS:
      return "REGENERATE";
    case DomainVersionKind.TIMELINE:
      return "RECOMPILE";
    case DomainVersionKind.PROJECT:
    case DomainVersionKind.MUSIC_MAP:
    case DomainVersionKind.SEQUENCE:
    case DomainVersionKind.SHOT:
    case DomainVersionKind.CREATIVE_MODULE:
    case DomainVersionKind.CREATIVE_KIT:
      return "REVIEW";
  }
}
