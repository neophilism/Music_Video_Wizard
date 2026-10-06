import { PgBoss } from "pg-boss";
import { getEnvironment } from "@/lib/env";

export const GENERATION_QUEUE = "music-video-generation";

const globalForJobs = globalThis as unknown as {
  musicVideoJobQueue?: Promise<PgBoss>;
};

async function configureGenerationQueue(boss: PgBoss) {
  const env = getEnvironment();
  const commonOptions = {
    retryLimit: env.JOB_RETRY_LIMIT,
    retryDelay: env.JOB_RETRY_DELAY_SECONDS,
    retryBackoff: true,
    retryDelayMax: env.JOB_RETRY_DELAY_MAX_SECONDS,
    expireInSeconds: env.JOB_EXPIRE_SECONDS,
    heartbeatSeconds: env.JOB_HEARTBEAT_SECONDS,
    retentionSeconds: 60 * 60 * 24 * 14,
    deleteAfterSeconds: 60 * 60 * 24 * 7,
    warningQueueSize: 5000
  };

  const existing = await boss.getQueue(GENERATION_QUEUE);
  if (existing) {
    await boss.updateQueue(GENERATION_QUEUE, commonOptions);
    return;
  }

  await boss.createQueue(GENERATION_QUEUE, {
    ...commonOptions,
    notify: true
  });
}

export async function getJobQueue(): Promise<PgBoss> {
  if (!globalForJobs.musicVideoJobQueue) {
    globalForJobs.musicVideoJobQueue = (async () => {
      const env = getEnvironment();
      const boss = new PgBoss({
        connectionString: env.DATABASE_URL,
        schema: env.JOB_QUEUE_SCHEMA,
        useListenNotify: true
      });

      boss.on("error", (error) => {
        console.error("Job queue error", error);
      });

      await boss.start();
      await configureGenerationQueue(boss);
      return boss;
    })().catch((error) => {
      globalForJobs.musicVideoJobQueue = undefined;
      throw error;
    });
  }

  return globalForJobs.musicVideoJobQueue;
}

export async function stopJobQueue(): Promise<void> {
  const pending = globalForJobs.musicVideoJobQueue;
  globalForJobs.musicVideoJobQueue = undefined;
  if (!pending) return;

  const boss = await pending;
  await boss.stop();
}
