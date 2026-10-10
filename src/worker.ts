import { startGenerationWorker } from "@/lib/jobs/worker";
import { startWorkerHeartbeat } from "@/lib/ops/worker-heartbeat";
import { db } from "@/lib/db";
import { stopJobQueue } from "@/lib/jobs/queue";
import { registerAllGenerationHandlers } from "@/lib/jobs/register-all";

async function main() {
  registerAllGenerationHandlers();
  const worker = await startGenerationWorker();
  let stopHeartbeat: () => Promise<void>;
  try {
    stopHeartbeat = await startWorkerHeartbeat();
  } catch (error) {
    await worker.stop();
    await stopJobQueue();
    throw error;
  }
  console.log(`Generation worker started: ${worker.workerId}`);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; draining generation worker.`);
    try {
      await worker.stop();
      await stopHeartbeat();
      await stopJobQueue();
      await db.$disconnect();
      process.exit(0);
    } catch {
      console.error("Generation worker did not stop cleanly.");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Generation worker failed to start", error);
  process.exit(1);
});
