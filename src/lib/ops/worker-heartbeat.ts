import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  WORKER_HEARTBEAT_INTERVAL_MS,
  WORKER_HEARTBEAT_RETENTION_MS
} from "./worker-health";

/** One heartbeat per process: no credentials, media, job IDs, or hostnames are stored. */
export async function startWorkerHeartbeat(): Promise<() => Promise<void>> {
  const id = randomUUID();
  await db.workerHeartbeat.create({ data: { id } });
  await db.workerHeartbeat.deleteMany({
    where: {
      lastSeenAt: {
        lt: new Date(Date.now() - WORKER_HEARTBEAT_RETENTION_MS)
      }
    }
  });

  let stopped = false;
  let pending: Promise<void> | null = null;
  const pulse = () => {
    if (stopped || pending) return;
    pending = db.workerHeartbeat.update({
      where: { id },
      data: { lastSeenAt: new Date() }
    }).then(() => undefined).catch(() => {
      // Report that the observation channel failed, without dumping connection secrets.
      console.error("Worker heartbeat update failed.");
    }).finally(() => {
      pending = null;
    });
  };
  const timer = setInterval(pulse, WORKER_HEARTBEAT_INTERVAL_MS);
  timer.unref();

  return async () => {
    stopped = true;
    clearInterval(timer);
    if (pending) await pending;
    await db.workerHeartbeat.deleteMany({ where: { id } });
  };
}
