-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'CONCEPT_SET';

-- CreateEnum
CREATE TYPE "ConceptOptionOrigin" AS ENUM ('GENERATED', 'REVISED', 'COMBINED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ConceptLineageRole" AS ENUM ('REVISION_SOURCE', 'COMBINATION_SOURCE');

-- CreateTable
CREATE TABLE "ConceptSet" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptSetVersion" (
    "id" UUID NOT NULL,
    "conceptSetId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceCreativeBriefVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "selectedConceptId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ConceptSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptOption" (
    "id" UUID NOT NULL,
    "conceptSetVersionId" UUID NOT NULL,
    "origin" "ConceptOptionOrigin" NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "generationJobId" UUID,
    "revisionInstruction" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptOptionLineage" (
    "id" UUID NOT NULL,
    "childConceptId" UUID NOT NULL,
    "parentConceptId" UUID NOT NULL,
    "role" "ConceptLineageRole" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptOptionLineage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConceptSet_projectId_key" ON "ConceptSet"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptSetVersion_nodeId_key" ON "ConceptSetVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptSetVersion_selectedConceptId_key" ON "ConceptSetVersion"("selectedConceptId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptSetVersion_conceptSetId_versionNumber_key" ON "ConceptSetVersion"("conceptSetId", "versionNumber");

-- CreateIndex
CREATE INDEX "ConceptSetVersion_conceptSetId_lifecycle_idx" ON "ConceptSetVersion"("conceptSetId", "lifecycle");

-- CreateIndex
CREATE INDEX "ConceptSetVersion_sourceCreativeBriefVersionId_idx" ON "ConceptSetVersion"("sourceCreativeBriefVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptOption_conceptSetVersionId_position_key" ON "ConceptOption"("conceptSetVersionId", "position");

-- CreateIndex
CREATE INDEX "ConceptOption_conceptSetVersionId_origin_idx" ON "ConceptOption"("conceptSetVersionId", "origin");

-- CreateIndex
CREATE INDEX "ConceptOption_generationJobId_idx" ON "ConceptOption"("generationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptOptionLineage_childConceptId_parentConceptId_role_key" ON "ConceptOptionLineage"("childConceptId", "parentConceptId", "role");

-- CreateIndex
CREATE INDEX "ConceptOptionLineage_parentConceptId_idx" ON "ConceptOptionLineage"("parentConceptId");

-- AddForeignKey
ALTER TABLE "ConceptSet" ADD CONSTRAINT "ConceptSet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSetVersion" ADD CONSTRAINT "ConceptSetVersion_conceptSetId_fkey" FOREIGN KEY ("conceptSetId") REFERENCES "ConceptSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSetVersion" ADD CONSTRAINT "ConceptSetVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSetVersion" ADD CONSTRAINT "ConceptSetVersion_sourceCreativeBriefVersionId_fkey" FOREIGN KEY ("sourceCreativeBriefVersionId") REFERENCES "CreativeBriefVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSetVersion" ADD CONSTRAINT "ConceptSetVersion_selectedConceptId_fkey" FOREIGN KEY ("selectedConceptId") REFERENCES "ConceptOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptSetVersion" ADD CONSTRAINT "ConceptSetVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptOption" ADD CONSTRAINT "ConceptOption_conceptSetVersionId_fkey" FOREIGN KEY ("conceptSetVersionId") REFERENCES "ConceptSetVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptOption" ADD CONSTRAINT "ConceptOption_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptOption" ADD CONSTRAINT "ConceptOption_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptOptionLineage" ADD CONSTRAINT "ConceptOptionLineage_childConceptId_fkey" FOREIGN KEY ("childConceptId") REFERENCES "ConceptOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptOptionLineage" ADD CONSTRAINT "ConceptOptionLineage_parentConceptId_fkey" FOREIGN KEY ("parentConceptId") REFERENCES "ConceptOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
