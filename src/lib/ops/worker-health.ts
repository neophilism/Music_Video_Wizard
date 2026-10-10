/** Probe contract: this reports queue/worker observation, not paid-provider readiness. */
export const WORKER_HEARTBEAT_INTERVAL_MS = 30_000;
export const WORKER_HEARTBEAT_FRESHNESS_MS = 90_000;
export const WORKER_HEARTBEAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type WorkerObservation = "worker-unverified" | "heartbeat-active" | "degraded";

export function classifyWorkerObservation(
  freshWorkerInstances: number,
  staleRunningJobs: number
): WorkerObservation {
  if (!Number.isSafeInteger(freshWorkerInstances) || freshWorkerInstances < 0) {
    throw new Error("Worker observation count must be a nonnegative integer.");
  }
  if (!Number.isSafeInteger(staleRunningJobs) || staleRunningJobs < 0) {
    throw new Error("Stale job count must be a nonnegative integer.");
  }
  if (staleRunningJobs > 0) return "degraded";
  if (freshWorkerInstances === 0) return "worker-unverified";
  return "heartbeat-active";
}
