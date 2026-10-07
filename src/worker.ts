import { startGenerationWorker } from "@/lib/jobs/worker";
import { stopJobQueue } from "@/lib/jobs/queue";
import { registerBuiltInGenerationHandlers } from "@/lib/music-analysis/register";
import { registerConceptGenerationHandlers } from "@/lib/concepts/register";
import { registerTreatmentGenerationHandlers } from "@/lib/treatment/register";

async function main() {
  registerBuiltInGenerationHandlers();
  registerConceptGenerationHandlers();
  registerTreatmentGenerationHandlers();
  const worker = await startGenerationWorker();
  console.log(`Generation worker started: ${worker.workerId}`);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; draining generation worker.`);
    await worker.stop();
    await stopJobQueue();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Generation worker failed to start", error);
  process.exit(1);
});
