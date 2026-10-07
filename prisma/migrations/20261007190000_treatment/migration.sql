-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'TREATMENT';

-- CreateTable
CREATE TABLE "Treatment" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentVersion" (
    "id" UUID NOT NULL,
    "treatmentId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceConceptSetVersionId" UUID NOT NULL,
    "sourceConceptId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "treatment" JSONB NOT NULL,
    "generationJobId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "TreatmentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Treatment_projectId_key" ON "Treatment"("projectId");
CREATE UNIQUE INDEX "TreatmentVersion_nodeId_key" ON "TreatmentVersion"("nodeId");
CREATE UNIQUE INDEX "TreatmentVersion_generationJobId_key" ON "TreatmentVersion"("generationJobId");
CREATE UNIQUE INDEX "TreatmentVersion_treatmentId_versionNumber_key" ON "TreatmentVersion"("treatmentId", "versionNumber");
CREATE INDEX "TreatmentVersion_treatmentId_lifecycle_idx" ON "TreatmentVersion"("treatmentId", "lifecycle");
CREATE INDEX "TreatmentVersion_sourceConceptSetVersionId_idx" ON "TreatmentVersion"("sourceConceptSetVersionId");
CREATE INDEX "TreatmentVersion_sourceConceptId_idx" ON "TreatmentVersion"("sourceConceptId");

ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_sourceConceptSetVersionId_fkey" FOREIGN KEY ("sourceConceptSetVersionId") REFERENCES "ConceptSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_sourceConceptId_fkey" FOREIGN KEY ("sourceConceptId") REFERENCES "ConceptOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreatmentVersion" ADD CONSTRAINT "TreatmentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
