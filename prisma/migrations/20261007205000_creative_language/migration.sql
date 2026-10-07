-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'CREATIVE_LANGUAGE';

-- CreateTable
CREATE TABLE "CreativeLanguage" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeLanguageVersion" (
    "id" UUID NOT NULL,
    "creativeLanguageId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceTreatmentVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "document" JSONB NOT NULL,
    "generationJobId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CreativeLanguageVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreativeLanguage_projectId_key" ON "CreativeLanguage"("projectId");
CREATE UNIQUE INDEX "CreativeLanguageVersion_nodeId_key" ON "CreativeLanguageVersion"("nodeId");
CREATE UNIQUE INDEX "CreativeLanguageVersion_generationJobId_key" ON "CreativeLanguageVersion"("generationJobId");
CREATE UNIQUE INDEX "CreativeLanguageVersion_creativeLanguageId_versionNumber_key" ON "CreativeLanguageVersion"("creativeLanguageId", "versionNumber");
CREATE INDEX "CreativeLanguageVersion_creativeLanguageId_lifecycle_idx" ON "CreativeLanguageVersion"("creativeLanguageId", "lifecycle");
CREATE INDEX "CreativeLanguageVersion_sourceTreatmentVersionId_idx" ON "CreativeLanguageVersion"("sourceTreatmentVersionId");

ALTER TABLE "CreativeLanguage" ADD CONSTRAINT "CreativeLanguage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeLanguageVersion" ADD CONSTRAINT "CreativeLanguageVersion_creativeLanguageId_fkey" FOREIGN KEY ("creativeLanguageId") REFERENCES "CreativeLanguage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeLanguageVersion" ADD CONSTRAINT "CreativeLanguageVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeLanguageVersion" ADD CONSTRAINT "CreativeLanguageVersion_sourceTreatmentVersionId_fkey" FOREIGN KEY ("sourceTreatmentVersionId") REFERENCES "TreatmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeLanguageVersion" ADD CONSTRAINT "CreativeLanguageVersion_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeLanguageVersion" ADD CONSTRAINT "CreativeLanguageVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
