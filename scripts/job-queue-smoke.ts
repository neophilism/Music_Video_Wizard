import { randomUUID } from "node:crypto";
import { PgBoss } from "pg-boss";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const boss = new PgBoss({
    connectionString,
    schema: "pgboss_ci",
    useListenNotify: true
  });

  const queueName = "queue-smoke";
  await boss.start();

  try {
    const existing = await boss.getQueue(queueName);
    if (!existing) {
      await boss.createQueue(queueName, {
        retryLimit: 1,
        heartbeatSeconds: 10,
        notify: true
      });
    }

    let resolveProcessed!: () => void;
    let rejectProcessed!: (error: Error) => void;
    const processed = new Promise<void>((resolve, reject) => {
      resolveProcessed = resolve;
      rejectProcessed = reject;
    });

    const workerId = await boss.work<{ marker: string }>(
      queueName,
      async ([job]) => {
        if (!job || job.data.marker !== "durable-queue-smoke") {
          rejectProcessed(new Error("Queue delivered an invalid payload."));
          return;
        }
        resolveProcessed();
      }
    );

    const id = randomUUID();
    const queued = await boss.send(
      queueName,
      { marker: "durable-queue-smoke" },
      { id }
    );
    if (queued !== id) throw new Error("Queue did not preserve explicit job id.");

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Queue smoke test timed out.")), 15000);
    });

    await Promise.race([processed, timeout]);
    await boss.offWork(queueName, { id: workerId, wait: true });
    await boss.deleteQueue(queueName);
  } finally {
    await boss.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
