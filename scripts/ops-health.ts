import { GenerationStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import { getEnvironment } from "../src/lib/env";
import {
  classifyWorkerObservation,
  WORKER_HEARTBEAT_FRESHNESS_MS
} from "../src/lib/ops/worker-health";

async function main() {
  const env = getEnvironment();
  const now = Date.now();
  const runningStaleAfterMs = Math.max(300_000, env.JOB_HEARTBEAT_SECONDS * 6_000);
  const queryStart = performance.now();
  await db.$queryRaw`SELECT 1`;
  const databaseLatencyMs = Math.round(performance.now() - queryStart);

  const [freshWorkerInstances, grouped, staleRunningJobs, oldQueuedJobs, failures24h] =
    await Promise.all([
      db.workerHeartbeat.count({
        where: { lastSeenAt: {
          gte: new Date(now - WORKER_HEARTBEAT_FRESHNESS_MS),
          lte: new Date(now + 30_000)
        } }
      }),
      db.generationJob.groupBy({ by: ["status"], _count: { _all: true } }),
      db.generationJob.count({
        where: {
          status: GenerationStatus.RUNNING,
          updatedAt: { lt: new Date(now - runningStaleAfterMs) }
        }
      }),
      db.generationJob.count({
        where: {
          status: GenerationStatus.QUEUED,
          createdAt: { lt: new Date(now - 15 * 60_000) }
        }
      }),
      db.generationJob.count({
        where: {
          status: GenerationStatus.FAILED,
          completedAt: { gte: new Date(now - 24 * 60 * 60_000) }
        }
      })
    ]);

  const counts = Object.fromEntries(
    Object.values(GenerationStatus).map(status => [status, 0])
  ) as Record<GenerationStatus, number>;
  for (const item of grouped) counts[item.status] = item._count._all;

  const observation = classifyWorkerObservation(freshWorkerInstances, staleRunningJobs);
  const report = {
    checkedAt: new Date(now).toISOString(),
    scope: "postgres-queue-and-worker-heartbeats",
    observation,
    databaseLatencyMs,
    heartbeatFreshWithinSeconds: WORKER_HEARTBEAT_FRESHNESS_MS / 1_000,
    workerInstancesObserved: freshWorkerInstances,
    staleRunningAfterSeconds: runningStaleAfterMs / 1_000,
    staleRunningJobs,
    queuedOver15Minutes: oldQueuedJobs,
    failedJobsLast24Hours: failures24h,
    counts
  };

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report));
  } else {
    console.log("Music Video Wizard queue and worker observation");
    console.log(JSON.stringify(report, null, 2));
  }

  // Missing workers are unverified, not evidence of healthy operation.
  if (process.argv.includes("--fail-unhealthy") && observation !== "heartbeat-active") {
    process.exitCode = 2;
  }
}

main().catch(() => {
  // Database driver errors can carry connection details; do not print their raw content.
  console.error("Worker observation unavailable; database or schema check failed.");
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
