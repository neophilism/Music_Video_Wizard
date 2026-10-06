-- CreateEnum
CREATE TYPE "WizardStepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "WizardProgress" (
    "id" UUID NOT NULL,
    "projectVersionId" UUID NOT NULL,
    "currentStepKey" TEXT NOT NULL DEFAULT 'project-setup',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WizardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WizardStepState" (
    "id" UUID NOT NULL,
    "wizardProgressId" UUID NOT NULL,
    "stepKey" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "status" "WizardStepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "payload" JSONB,
    "payloadFingerprint" TEXT,
    "contentRevision" INTEGER NOT NULL DEFAULT 0,
    "lastSavedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "needsReviewAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WizardStepState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WizardProgress_projectVersionId_key" ON "WizardProgress"("projectVersionId");

-- CreateIndex
CREATE INDEX "WizardProgress_updatedAt_idx" ON "WizardProgress"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WizardStepState_wizardProgressId_stepKey_key" ON "WizardStepState"("wizardProgressId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "WizardStepState_wizardProgressId_ordinal_key" ON "WizardStepState"("wizardProgressId", "ordinal");

-- CreateIndex
CREATE INDEX "WizardStepState_wizardProgressId_status_idx" ON "WizardStepState"("wizardProgressId", "status");

-- AddForeignKey
ALTER TABLE "WizardProgress" ADD CONSTRAINT "WizardProgress_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WizardStepState" ADD CONSTRAINT "WizardStepState_wizardProgressId_fkey" FOREIGN KEY ("wizardProgressId") REFERENCES "WizardProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
