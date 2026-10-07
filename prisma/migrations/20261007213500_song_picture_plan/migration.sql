-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'SONG_PICTURE_PLAN';

-- CreateTable
CREATE TABLE "SongPicturePlan" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SongPicturePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SongPicturePlanVersion" (
    "id" UUID NOT NULL,
    "songPicturePlanId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceTreatmentVersionId" UUID NOT NULL,
    "sourceCreativeLanguageVersionId" UUID NOT NULL,
    "sourceMusicMapVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "document" JSONB NOT NULL,
    "generationJobId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    CONSTRAINT "SongPicturePlanVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SongPicturePlan_projectId_key" ON "SongPicturePlan"("projectId");
CREATE UNIQUE INDEX "SongPicturePlanVersion_nodeId_key" ON "SongPicturePlanVersion"("nodeId");
CREATE UNIQUE INDEX "SongPicturePlanVersion_generationJobId_key" ON "SongPicturePlanVersion"("generationJobId");
CREATE UNIQUE INDEX "SongPicturePlanVersion_songPicturePlanId_versionNumber_key" ON "SongPicturePlanVersion"("songPicturePlanId", "versionNumber");
CREATE INDEX "SongPicturePlanVersion_songPicturePlanId_lifecycle_idx" ON "SongPicturePlanVersion"("songPicturePlanId", "lifecycle");
CREATE INDEX "SongPicturePlanVersion_sourceTreatmentVersionId_idx" ON "SongPicturePlanVersion"("sourceTreatmentVersionId");
CREATE INDEX "SongPicturePlanVersion_sourceCreativeLanguageVersionId_idx" ON "SongPicturePlanVersion"("sourceCreativeLanguageVersionId");
CREATE INDEX "SongPicturePlanVersion_sourceMusicMapVersionId_idx" ON "SongPicturePlanVersion"("sourceMusicMapVersionId");

ALTER TABLE "SongPicturePlan" ADD CONSTRAINT "SongPicturePlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_songPicturePlanId_fkey" FOREIGN KEY ("songPicturePlanId") REFERENCES "SongPicturePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_sourceTreatmentVersionId_fkey" FOREIGN KEY ("sourceTreatmentVersionId") REFERENCES "TreatmentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_sourceCreativeLanguageVersionId_fkey" FOREIGN KEY ("sourceCreativeLanguageVersionId") REFERENCES "CreativeLanguageVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_sourceMusicMapVersionId_fkey" FOREIGN KEY ("sourceMusicMapVersionId") REFERENCES "MusicMapVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SongPicturePlanVersion" ADD CONSTRAINT "SongPicturePlanVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
