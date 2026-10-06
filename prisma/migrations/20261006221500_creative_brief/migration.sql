-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'CREATIVE_BRIEF';

-- CreateTable
CREATE TABLE "CreativeBrief" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeBriefVersion" (
    "id" UUID NOT NULL,
    "creativeBriefId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceMusicMapVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "brief" JSONB NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CreativeBriefVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreativeBrief_projectId_key" ON "CreativeBrief"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeBriefVersion_nodeId_key" ON "CreativeBriefVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeBriefVersion_creativeBriefId_versionNumber_key" ON "CreativeBriefVersion"("creativeBriefId", "versionNumber");

-- CreateIndex
CREATE INDEX "CreativeBriefVersion_creativeBriefId_lifecycle_idx" ON "CreativeBriefVersion"("creativeBriefId", "lifecycle");

-- CreateIndex
CREATE INDEX "CreativeBriefVersion_sourceMusicMapVersionId_idx" ON "CreativeBriefVersion"("sourceMusicMapVersionId");

-- AddForeignKey
ALTER TABLE "CreativeBrief" ADD CONSTRAINT "CreativeBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBriefVersion" ADD CONSTRAINT "CreativeBriefVersion_creativeBriefId_fkey" FOREIGN KEY ("creativeBriefId") REFERENCES "CreativeBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBriefVersion" ADD CONSTRAINT "CreativeBriefVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBriefVersion" ADD CONSTRAINT "CreativeBriefVersion_sourceMusicMapVersionId_fkey" FOREIGN KEY ("sourceMusicMapVersionId") REFERENCES "MusicMapVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBriefVersion" ADD CONSTRAINT "CreativeBriefVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
