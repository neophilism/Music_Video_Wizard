import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  DependencyRelation,
  DomainVersionKind
} from "@prisma/client";
import { db } from "../src/lib/db";
import {
  analyzeDependencyImpact,
  analyzeReplacementImpact,
  DependencyCycleError,
  registerDependencyEdge,
  registerDependencyEdges
} from "../src/lib/dependency-graph/service";

async function main() {
  const styleNodeId = randomUUID();
  const sameStyleNodeId = randomUUID();
  const changedStyleNodeId = randomUUID();
  const shotNodeId = randomUUID();
  const assetNodeId = randomUUID();
  const timelineNodeId = randomUUID();

  const nodeIds = [
    styleNodeId,
    sameStyleNodeId,
    changedStyleNodeId,
    shotNodeId,
    assetNodeId,
    timelineNodeId
  ];

  try {
    await db.domainVersionNode.createMany({
      data: [
        {
          id: styleNodeId,
          kind: DomainVersionKind.CREATIVE_MODULE,
          fingerprint: "style-fingerprint-a"
        },
        {
          id: sameStyleNodeId,
          kind: DomainVersionKind.CREATIVE_MODULE,
          fingerprint: "style-fingerprint-a"
        },
        {
          id: changedStyleNodeId,
          kind: DomainVersionKind.CREATIVE_MODULE,
          fingerprint: "style-fingerprint-b"
        },
        {
          id: shotNodeId,
          kind: DomainVersionKind.SHOT
        },
        {
          id: assetNodeId,
          kind: DomainVersionKind.ASSET
        },
        {
          id: timelineNodeId,
          kind: DomainVersionKind.TIMELINE
        }
      ]
    });

    await registerDependencyEdges([
      {
        upstreamNodeId: styleNodeId,
        downstreamNodeId: shotNodeId,
        relation: DependencyRelation.REFERENCES,
        reason: "Shot resolves its visual aesthetic from this creative decision."
      },
      {
        upstreamNodeId: shotNodeId,
        downstreamNodeId: assetNodeId,
        relation: DependencyRelation.GENERATED_FROM,
        reason: "Generated frame is derived from the locked shot specification."
      },
      {
        upstreamNodeId: assetNodeId,
        downstreamNodeId: timelineNodeId,
        relation: DependencyRelation.COMPILED_FROM,
        reason: "Timeline contains the generated media asset."
      }
    ]);

    const impact = await analyzeDependencyImpact([styleNodeId]);
    assert.equal(impact.truncated, false);
    assert.deepEqual(
      impact.affected.map(({ nodeId, depth, action }) => ({
        nodeId,
        depth,
        action
      })),
      [
        { nodeId: shotNodeId, depth: 1, action: "REVIEW" },
        { nodeId: assetNodeId, depth: 2, action: "REGENERATE" },
        { nodeId: timelineNodeId, depth: 3, action: "RECOMPILE" }
      ]
    );

    const unchanged = await analyzeReplacementImpact(
      styleNodeId,
      sameStyleNodeId
    );
    assert.equal(unchanged.materialChange, false);
    assert.equal(unchanged.affected.length, 0);

    const changed = await analyzeReplacementImpact(
      styleNodeId,
      changedStyleNodeId
    );
    assert.equal(changed.materialChange, true);
    assert.equal(changed.affected.length, 3);

    await assert.rejects(
      () =>
        registerDependencyEdge({
          upstreamNodeId: timelineNodeId,
          downstreamNodeId: styleNodeId,
          relation: DependencyRelation.DERIVED_FROM,
          reason: "This edge must be rejected because it closes a cycle."
        }),
      DependencyCycleError
    );

    console.log("Dependency graph smoke test passed.");
  } finally {
    await db.dependencyEdge.deleteMany({
      where: {
        OR: [
          { upstreamNodeId: { in: nodeIds } },
          { downstreamNodeId: { in: nodeIds } }
        ]
      }
    });
    await db.domainVersionNode.deleteMany({
      where: { id: { in: nodeIds } }
    });
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
