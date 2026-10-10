CREATE TABLE "WorkerHeartbeat" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkerHeartbeat_lastSeenAt_idx" ON "WorkerHeartbeat"("lastSeenAt");
