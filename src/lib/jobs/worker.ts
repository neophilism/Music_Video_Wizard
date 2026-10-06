import type { Job } from "pg-boss";
import {
  GenerationEventType,
  GenerationStatus,
  Prisma
} from "@prisma/client";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import { normalizeProgress } from "./progress";
import {
  generationHandlers,
  PermanentGenerationError
} from "./registry";
import { GENERATION_QUEUE, getJobQueue } from "./queue";

export interface GenerationQueuePayload {
  generationJobId: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown generation error";
}

function jsonMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function reportProgress(
  jobId: string,
  attempt: number,
  progressPercent: number,
  message?: string,
  metadata?: Record<string, unknown>
) {
  const normalized = normalizeProgress(progressPercent);

  await db.$transaction(async (tx) => {
    const updated = await tx.generationJob.updateMany({
      where: {
        id: jobId,
        status: GenerationStatus.RUNNING
      },
      data: {
        progressPercent: normalized,
        progressMessage: message
      }
    });

    if (updated.count === 0) return;

    await tx.generationJobEvent.create({
      data: {
        jobId,
        type: GenerationEventType.PROGRESS,
        attempt,
        progressPercent: normalized,
        message,
        metadata: metadata ? jsonMetadata(metadata) : undefined
      }
    });
  });
}

async function markStarted(jobId: string, attempt: number): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const updated = await tx.generationJob.updateMany({
      where: {
        id: jobId,
        status: {
          notIn: [
            GenerationStatus.CANCELLED,
            GenerationStatus.SUCCEEDED,
            GenerationStatus.FAILED
          ]
        }
      },
      data: {
        status: GenerationStatus.RUNNING,
        attemptCount: attempt,
        startedAt: new Date(),
        progressMessage: "Running."
      }
    });

    if (updated.count === 0) return false;

    await tx.generationJobEvent.create({
      data: {
        jobId,
        type: GenerationEventType.STARTED,
        attempt,
        message: `Attempt ${attempt} started.`
      }
    });

    return true;
  });
}

async function markSucceeded(
  jobId: string,
  attempt: number,
  result: unknown
): Promise<void> {
  await db.$transaction(async (tx) => {
    const updated = await tx.generationJob.updateMany({
      where: {
        id: jobId,
        status: GenerationStatus.RUNNING
      },
      data: {
        status: GenerationStatus.SUCCEEDED,
        progressPercent: 100,
        progressMessage: "Complete.",
        responseMetadata: jsonMetadata(result),
        errorMessage: null,
        completedAt: new Date()
      }
    });

    if (updated.count === 0) return;

    await tx.generationJobEvent.create({
      data: {
        jobId,
        type: GenerationEventType.SUCCEEDED,
        attempt,
        progressPercent: 100,
        message: "Job completed."
      }
    });
  });
}

async function markFailure(
  jobId: string,
  attempt: number,
  maxAttempts: number,
  error: unknown,
  permanent: boolean
): Promise<void> {
  const willRetry = !permanent && attempt < maxAttempts;
  const message = errorMessage(error);

  await db.$transaction(async (tx) => {
    const current = await tx.generationJob.findUnique({
      where: { id: jobId },
      select: { status: true }
    });

    if (!current || current.status === GenerationStatus.CANCELLED) return;

    await tx.generationJob.update({
      where: { id: jobId },
      data: {
        status: willRetry ? GenerationStatus.QUEUED : GenerationStatus.FAILED,
        errorMessage: message,
        progressMessage: willRetry ? "Retry scheduled." : "Failed.",
        completedAt: willRetry ? null : new Date()
      }
    });

    await tx.generationJobEvent.create({
      data: {
        jobId,
        type: willRetry
          ? GenerationEventType.RETRY_SCHEDULED
          : GenerationEventType.FAILED,
        attempt,
        message
      }
    });
  });
}

export async function processGenerationQueueJob(
  queueJob: Job<GenerationQueuePayload>
): Promise<unknown> {
  const generationJob = await db.generationJob.findUnique({
    where: { id: queueJob.data.generationJobId }
  });

  if (!generationJob) {
    throw new PermanentGenerationError(
      `Generation job ${queueJob.data.generationJobId} does not exist.`
    );
  }

  if (generationJob.status === GenerationStatus.CANCELLED) {
    return { cancelled: true };
  }

  const attempt = queueJob.retryCount + 1;
  const started = await markStarted(generationJob.id, attempt);
  if (!started) return { ignored: true };

  const handler = generationHandlers.get(
    generationJob.kind,
    generationJob.providerKey
  );

  if (!handler) {
    const error = new PermanentGenerationError(
      `No handler is registered for ${generationJob.kind}/${generationJob.providerKey}.`
    );
    await markFailure(
      generationJob.id,
      attempt,
      generationJob.maxAttempts,
      error,
      true
    );
    return { failed: true, reason: error.message };
  }

  try {
    const result = await handler(generationJob, {
      signal: queueJob.signal,
      reportProgress: (progressPercent, message, metadata) =>
        reportProgress(
          generationJob.id,
          attempt,
          progressPercent,
          message,
          metadata
        )
    });

    if (queueJob.signal.aborted) {
      return { cancelled: true };
    }

    await markSucceeded(generationJob.id, attempt, result);
    return result;
  } catch (error) {
    const permanent = error instanceof PermanentGenerationError;
    await markFailure(
      generationJob.id,
      attempt,
      generationJob.maxAttempts,
      error,
      permanent
    );

    if (permanent) {
      return { failed: true, reason: errorMessage(error) };
    }

    throw error;
  }
}

export async function startGenerationWorker() {
  const env = getEnvironment();
  const boss = await getJobQueue();

  const workerId = await boss.work<GenerationQueuePayload>(
    GENERATION_QUEUE,
    {
      localConcurrency: env.JOB_WORKER_CONCURRENCY,
      groupConcurrency: env.JOB_WORKSPACE_CONCURRENCY,
      heartbeatRefreshSeconds: Math.max(
        1,
        Math.floor(env.JOB_HEARTBEAT_SECONDS / 2)
      )
    },
    async ([job]) => {
      if (!job) return;
      return processGenerationQueueJob(job);
    }
  );

  return {
    workerId,
    stop: () =>
      boss.offWork(GENERATION_QUEUE, {
        id: workerId,
        wait: true
      })
  };
}
