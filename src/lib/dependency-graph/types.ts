import type {
  DependencyRelation,
  DomainVersionKind
} from "@prisma/client";

export type DependencyImpactAction =
  | "REVIEW"
  | "REGENERATE"
  | "RECOMPILE";

export interface DependencyEdgeInput {
  upstreamNodeId: string;
  downstreamNodeId: string;
  relation: DependencyRelation;
  reason?: string;
}

export interface DependencyImpactCause {
  upstreamNodeId: string;
  relation: DependencyRelation;
  reason: string | null;
}

export interface DependencyImpactItem {
  nodeId: string;
  kind: DomainVersionKind;
  depth: number;
  action: DependencyImpactAction;
  causes: DependencyImpactCause[];
}

export interface DependencyImpactAnalysis {
  rootNodeIds: string[];
  affected: DependencyImpactItem[];
  truncated: boolean;
}

export interface ReplacementImpactAnalysis extends DependencyImpactAnalysis {
  previousNodeId: string;
  replacementNodeId: string;
  materialChange: boolean;
}
