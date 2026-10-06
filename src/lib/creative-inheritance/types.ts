import type {
  CreativeModuleKind,
  DomainVersionKind
} from "@prisma/client";

export interface CreativeInheritanceScope {
  nodeId: string;
  versionId: string;
  kind: DomainVersionKind;
}

export interface CreativeBindingCandidate {
  bindingId: string;
  scopeNodeId: string;
  slot: string;
  creativeModuleVersionId: string;
  creativeModuleNodeId: string;
  moduleKind: CreativeModuleKind;
  moduleName: string;
  moduleVersionNumber: number;
}

export interface ResolvedCreativeBinding
  extends CreativeBindingCandidate {
  sourceScope: CreativeInheritanceScope;
  shadowed: Array<
    CreativeBindingCandidate & {
      sourceScope: CreativeInheritanceScope;
    }
  >;
}

export interface CreativeInheritanceResolution {
  scopes: CreativeInheritanceScope[];
  bindings: ResolvedCreativeBinding[];
}
