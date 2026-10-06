import {
  DependencyRelation,
  DomainVersionKind,
  Prisma
} from "@prisma/client";
import { db } from "@/lib/db";
import { impactActionForKind } from "./rules";
import type {
  DependencyEdgeInput,
  DependencyImpactAnalysis,
  DependencyImpactCause,
  ReplacementImpactAnalysis
} from "./types";

const GRAPH_LOCK_CLASS = 761204;
const GRAPH_LOCK_KEY = 1206;
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_NODES = 5000;

type GraphTransaction = Prisma.TransactionClient;

export class DependencyGraphError extends Error {}

export class DependencyNodeNotFoundError extends DependencyGraphError {
  constructor(nodeIds: string[]) {
    super("Dependency graph node not found: " + nodeIds.join(", "));
    this.name = "DependencyNodeNotFoundError";
  }
}

export class DependencyCycleError extends DependencyGraphError {
  constructor(upstreamNodeId: string, downstreamNodeId: string) {
    super(
      "Dependency edge " +
        upstreamNodeId +
        " -> " +
        downstreamNodeId +
        " would create a cycle."
    );
    this.name = "DependencyCycleError";
  }
}

async function acquireGraphWriteLock(tx: GraphTransaction): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(${GRAPH_LOCK_CLASS}, ${GRAPH_LOCK_KEY})
  `;
}

async function assertNodesExist(
  tx: GraphTransaction,
  nodeIds: string[]
): Promise<void> {
  const uniqueNodeIds = [...new Set(nodeIds)];
  const found = await tx.domainVersionNode.findMany({
    where: { id: { in: uniqueNodeIds } },
    select: { id: true }
  });
  const foundIds = new Set(found.map(({ id }) => id));
  const missing = uniqueNodeIds.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new DependencyNodeNotFoundError(missing);
  }
}

async function createsCycle(
  tx: GraphTransaction,
  upstreamNodeId: string,
  downstreamNodeId: string
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ cycle: boolean }>>`
    WITH RECURSIVE descendants("nodeId") AS (
      SELECT "downstreamNodeId"
      FROM "DependencyEdge"
      WHERE "upstreamNodeId" = ${downstreamNodeId}::uuid

      UNION

      SELECT edge."downstreamNodeId"
      FROM "DependencyEdge" edge
      INNER JOIN descendants
        ON edge."upstreamNodeId" = descendants."nodeId"
    )
    SELECT EXISTS (
      SELECT 1
      FROM descendants
      WHERE "nodeId" = ${upstreamNodeId}::uuid
    ) AS "cycle"
  `;

  return rows[0]?.cycle ?? false;
}

async function registerDependencyEdgeLocked(
  tx: GraphTransaction,
  input: DependencyEdgeInput
) {
  if (input.upstreamNodeId === input.downstreamNodeId) {
    throw new DependencyCycleError(
      input.upstreamNodeId,
      input.downstreamNodeId
    );
  }

  if (
    await createsCycle(
      tx,
      input.upstreamNodeId,
      input.downstreamNodeId
    )
  ) {
    throw new DependencyCycleError(
      input.upstreamNodeId,
      input.downstreamNodeId
    );
  }

  return tx.dependencyEdge.upsert({
    where: {
      upstreamNodeId_downstreamNodeId_relation: {
        upstreamNodeId: input.upstreamNodeId,
        downstreamNodeId: input.downstreamNodeId,
        relation: input.relation
      }
    },
    create: {
      upstreamNodeId: input.upstreamNodeId,
      downstreamNodeId: input.downstreamNodeId,
      relation: input.relation,
      reason: input.reason
    },
    update: {
      reason: input.reason
    }
  });
}

export async function registerDependencyEdgeInTransaction(
  tx: GraphTransaction,
  input: DependencyEdgeInput
) {
  await acquireGraphWriteLock(tx);
  await assertNodesExist(tx, [
    input.upstreamNodeId,
    input.downstreamNodeId
  ]);
  return registerDependencyEdgeLocked(tx, input);
}

export async function registerDependencyEdge(input: DependencyEdgeInput) {
  return db.$transaction((tx) =>
    registerDependencyEdgeInTransaction(tx, input)
  );
}

export async function registerDependencyEdges(
  inputs: DependencyEdgeInput[]
) {
  if (inputs.length === 0) return [];

  return db.$transaction(async (tx) => {
    await acquireGraphWriteLock(tx);
    await assertNodesExist(
      tx,
      inputs.flatMap((input) => [
        input.upstreamNodeId,
        input.downstreamNodeId
      ])
    );

    const results = [];
    for (const input of inputs) {
      results.push(await registerDependencyEdgeLocked(tx, input));
    }
    return results;
  });
}

export async function removeDependencyEdge(input: DependencyEdgeInput) {
  return db.dependencyEdge.deleteMany({
    where: {
      upstreamNodeId: input.upstreamNodeId,
      downstreamNodeId: input.downstreamNodeId,
      relation: input.relation
    }
  });
}

export async function analyzeDependencyImpact(
  rootNodeIds: string[],
  options: {
    maxDepth?: number;
    maxNodes?: number;
  } = {}
): Promise<DependencyImpactAnalysis> {
  const roots = [...new Set(rootNodeIds)];
  if (roots.length === 0) {
    return { rootNodeIds: [], affected: [], truncated: false };
  }

  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new DependencyGraphError("maxDepth must be a positive integer.");
  }
  if (!Number.isInteger(maxNodes) || maxNodes < 1) {
    throw new DependencyGraphError("maxNodes must be a positive integer.");
  }

  const existingRoots = await db.domainVersionNode.findMany({
    where: { id: { in: roots } },
    select: { id: true }
  });
  if (existingRoots.length !== roots.length) {
    const found = new Set(existingRoots.map(({ id }) => id));
    throw new DependencyNodeNotFoundError(
      roots.filter((id) => !found.has(id))
    );
  }

  const rootSql = Prisma.join(
    roots.map((id) => Prisma.sql`${id}::uuid`)
  );

  const rows = await db.$queryRaw<Array<{ nodeId: string; depth: number }>>(
    Prisma.sql`
      WITH RECURSIVE impact("nodeId", "depth", "path") AS (
        SELECT
          edge."downstreamNodeId",
          1,
          ARRAY[edge."upstreamNodeId", edge."downstreamNodeId"]::uuid[]
        FROM "DependencyEdge" edge
        WHERE edge."upstreamNodeId" IN (${rootSql})

        UNION ALL

        SELECT
          edge."downstreamNodeId",
          impact."depth" + 1,
          impact."path" || edge."downstreamNodeId"
        FROM "DependencyEdge" edge
        INNER JOIN impact
          ON edge."upstreamNodeId" = impact."nodeId"
        WHERE
          impact."depth" < ${maxDepth}
          AND NOT edge."downstreamNodeId" = ANY(impact."path")
      )
      SELECT
        "nodeId",
        MIN("depth")::int AS "depth"
      FROM impact
      GROUP BY "nodeId"
      ORDER BY MIN("depth"), "nodeId"
      LIMIT ${maxNodes + 1}
    `
  );

  const truncated = rows.length > maxNodes;
  const selectedRows = rows.slice(0, maxNodes);
  const affectedIds = selectedRows.map(({ nodeId }) => nodeId);

  if (affectedIds.length === 0) {
    return { rootNodeIds: roots, affected: [], truncated };
  }

  const nodes = await db.domainVersionNode.findMany({
    where: { id: { in: affectedIds } },
    select: { id: true, kind: true }
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const relevantNodeIds = [...new Set([...roots, ...affectedIds])];
  const edges = await db.dependencyEdge.findMany({
    where: {
      upstreamNodeId: { in: relevantNodeIds },
      downstreamNodeId: { in: affectedIds }
    },
    select: {
      upstreamNodeId: true,
      downstreamNodeId: true,
      relation: true,
      reason: true
    }
  });

  const causesByNode = new Map<string, DependencyImpactCause[]>();
  for (const edge of edges) {
    const causes = causesByNode.get(edge.downstreamNodeId) ?? [];
    causes.push({
      upstreamNodeId: edge.upstreamNodeId,
      relation: edge.relation,
      reason: edge.reason
    });
    causesByNode.set(edge.downstreamNodeId, causes);
  }

  const affected = selectedRows.map(({ nodeId, depth }) => {
    const node = nodeById.get(nodeId);
    if (!node) {
      throw new DependencyNodeNotFoundError([nodeId]);
    }

    return {
      nodeId,
      kind: node.kind,
      depth,
      action: impactActionForKind(node.kind),
      causes: causesByNode.get(nodeId) ?? []
    };
  });

  return {
    rootNodeIds: roots,
    affected,
    truncated
  };
}

export async function analyzeReplacementImpact(
  previousNodeId: string,
  replacementNodeId: string,
  options: {
    maxDepth?: number;
    maxNodes?: number;
  } = {}
): Promise<ReplacementImpactAnalysis> {
  if (previousNodeId === replacementNodeId) {
    return {
      previousNodeId,
      replacementNodeId,
      materialChange: false,
      rootNodeIds: [previousNodeId],
      affected: [],
      truncated: false
    };
  }

  const nodes = await db.domainVersionNode.findMany({
    where: { id: { in: [previousNodeId, replacementNodeId] } },
    select: { id: true, kind: true, fingerprint: true }
  });

  if (nodes.length !== 2) {
    const found = new Set(nodes.map(({ id }) => id));
    throw new DependencyNodeNotFoundError(
      [previousNodeId, replacementNodeId].filter((id) => !found.has(id))
    );
  }

  const previous = nodes.find(({ id }) => id === previousNodeId)!;
  const replacement = nodes.find(({ id }) => id === replacementNodeId)!;

  if (previous.kind !== replacement.kind) {
    throw new DependencyGraphError(
      "Replacement kind mismatch: " +
        previous.kind +
        " cannot be replaced by " +
        replacement.kind +
        "."
    );
  }

  const materialChange =
    !previous.fingerprint ||
    !replacement.fingerprint ||
    previous.fingerprint !== replacement.fingerprint;

  if (!materialChange) {
    return {
      previousNodeId,
      replacementNodeId,
      materialChange: false,
      rootNodeIds: [previousNodeId],
      affected: [],
      truncated: false
    };
  }

  const impact = await analyzeDependencyImpact([previousNodeId], options);
  return {
    previousNodeId,
    replacementNodeId,
    materialChange: true,
    ...impact
  };
}

export { DependencyRelation, DomainVersionKind };
