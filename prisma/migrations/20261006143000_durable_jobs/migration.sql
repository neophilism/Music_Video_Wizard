-- CreateEnum
CREATE TYPE "GenerationEventType" AS ENUM ('QUEUED', 'STARTED', 'PROGRESS', 'RETRY_SCHEDULED', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "GenerationJob"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "progressMessage" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3),
ADD COLUMN "cancelRequestedAt" TIMESTAMP(3);

UPDATE "GenerationJob" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "GenerationJob" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "GenerationJobEvent" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "type" "GenerationEventType" NOT NULL,
    "attempt" INTEGER,
    "progressPercent" INTEGER,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationJobEvent_jobId_createdAt_idx" ON "GenerationJobEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJobEvent_type_createdAt_idx" ON "GenerationJobEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "GenerationJobEvent"
ADD CONSTRAINT "GenerationJobEvent_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
