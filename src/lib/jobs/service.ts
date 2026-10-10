import { randomUUID } from "node:crypto";
import {
  GenerationEventType,
  GenerationKind,
  GenerationStatus,
  Prisma
} from "@prisma/client";
import { fromPrisma } from "pg-boss";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";
import { GENERATION_QUEUE, getJobQueue } from "./queue";
import { requestGenerationExecutorWake } from "./wake";

export interface GenerationJobInputReference {
  nodeId: string;
  role: string;
  position?: number;
}

export interface EnqueueGenerationJobInput {
  jobId?: string;
  workspaceId: string;
  projectId?: string;
  kind: GenerationKind;
  providerKey: string;
  modelKey?: string;
  requestSnapshot: Prisma.InputJsonValue;
  requestedByUserId?: string;
  inputs?: GenerationJobInputReference[];
  retryLimit?: number;
  prepare?: (
    tx: Prisma.TransactionClient,
    jobId: string
  ) => Promise<unknown>;
}

export async function enqueueGenerationJob(input: EnqueueGenerationJobInput) {
  const env = getEnvironment();
  const boss = await getJobQueue();
  const jobId = input.jobId ?? randomUUID();
  const retryLimit = input.retryLimit ?? env.JOB_RETRY_LIMIT;
  const maxAttempts = retryLimit + 1;

  const created = await db.$transaction(async (tx) => {
    if (input.projectId) {
      const project = await tx.project.findFirst({
        where: {
          id: input.projectId,
          workspaceId: input.workspaceId
        },
        select: { id: true }
      });
      if (!project) {
        throw new Error("Project does not belong to the selected workspace.");
      }
    }

    const created = await tx.generationJob.create({
      data: {
        id: jobId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        kind: input.kind,
        providerKey: input.providerKey,
        modelKey: input.modelKey,
        requestSnapshot: input.requestSnapshot,
        requestedByUserId: input.requestedByUserId,
        maxAttempts,
        inputs: input.inputs?.length
          ? {
              create: input.inputs.map((reference) => ({
                nodeId: reference.nodeId,
                role: reference.role,
                position: reference.position ?? 0
              }))
            }
          : undefined,
        events: {
          create: {
            type: GenerationEventType.QUEUED,
            message: "Job queued."
          }
        }
      }
    });

    if (input.prepare) {
      await input.prepare(tx, jobId);
    }

    const queueId = await boss.send(
      GENERATION_QUEUE,
      { generationJobId: jobId },
      {
        id: jobId,
        group: { id: input.workspaceId },
        retryLimit,
        retryDelay: env.JOB_RETRY_DELAY_SECONDS,
        retryBackoff: true,
        retryDelayMax: env.JOB_RETRY_DELAY_MAX_SECONDS,
        expireInSeconds: env.JOB_EXPIRE_SECONDS,
        heartbeatSeconds: env.JOB_HEARTBEAT_SECONDS,
        db: fromPrisma(tx)
      }
    );

    if (queueId !== jobId) {
      throw new Error("Durable queue did not return the requested job identifier.");
    }

    return created;
  });

  requestGenerationExecutorWake();
  return created;
}

export async function cancelGenerationJob(jobId: string): Promise<boolean> {
  const boss = await getJobQueue();
  await boss.cancel(GENERATION_QUEUE, jobId);

  const [queueJob] = await boss.findJobs(GENERATION_QUEUE, { id: jobId });
  if (!queueJob || queueJob.state !== "cancelled") return false;

  const now = new Date();
  const cancelled = await db.$transaction(async (tx) => {
    const updated = await tx.generationJob.updateMany({
      where: {
        id: jobId,
        status: {
          notIn: [
            GenerationStatus.SUCCEEDED,
            GenerationStatus.FAILED,
            GenerationStatus.CANCELLED
          ]
        }
      },
      data: {
        status: GenerationStatus.CANCELLED,
        cancelRequestedAt: now,
        completedAt: now,
        progressMessage: "Cancelled."
      }
    });

    if (updated.count === 0) return false;

    await tx.generationJobEvent.create({
      data: {
        jobId,
        type: GenerationEventType.CANCELLED,
        message: "Job cancelled."
      }
    });

    return true;
  });

  return cancelled;
}
