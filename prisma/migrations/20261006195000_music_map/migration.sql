-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'MUSIC_MAP';

-- CreateEnum
CREATE TYPE "MusicMapAnchorKind" AS ENUM ('SECTION', 'INTRO', 'OUTRO', 'BEAT', 'BAR', 'DROP', 'TRANSITION', 'VOCAL_PASSAGE', 'INSTRUMENTAL_BREAK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MusicMapAnchorSource" AS ENUM ('ANALYSIS', 'USER');

-- CreateEnum
CREATE TYPE "MusicMapAnchorDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "MusicMap" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicMapVersion" (
    "id" UUID NOT NULL,
    "musicMapId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceAnalysisVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "tempoBpm" DOUBLE PRECISION,
    "meterNumerator" INTEGER NOT NULL DEFAULT 4,
    "meterDenominator" INTEGER NOT NULL DEFAULT 4,
    "beatOffsetMs" INTEGER NOT NULL DEFAULT 0,
    "barPhase" INTEGER NOT NULL DEFAULT 0,
    "beatGridSource" TEXT NOT NULL DEFAULT 'analysis',
    "beatGridMs" JSONB NOT NULL,
    "barGridMs" JSONB NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "MusicMapVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicMapAnchor" (
    "id" UUID NOT NULL,
    "musicMapVersionId" UUID NOT NULL,
    "sourceKey" TEXT,
    "kind" "MusicMapAnchorKind" NOT NULL,
    "source" "MusicMapAnchorSource" NOT NULL,
    "decision" "MusicMapAnchorDecision" NOT NULL DEFAULT 'PENDING',
    "label" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER,
    "sourceStartMs" INTEGER,
    "sourceEndMs" INTEGER,
    "sourceConfidence" DOUBLE PRECISION,
    "position" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicMapAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicMap_projectId_key" ON "MusicMap"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicMapVersion_nodeId_key" ON "MusicMapVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicMapVersion_musicMapId_versionNumber_key" ON "MusicMapVersion"("musicMapId", "versionNumber");

-- CreateIndex
CREATE INDEX "MusicMapVersion_musicMapId_lifecycle_idx" ON "MusicMapVersion"("musicMapId", "lifecycle");

-- CreateIndex
CREATE INDEX "MusicMapVersion_sourceAnalysisVersionId_idx" ON "MusicMapVersion"("sourceAnalysisVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicMapAnchor_musicMapVersionId_sourceKey_key" ON "MusicMapAnchor"("musicMapVersionId", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "MusicMapAnchor_musicMapVersionId_position_key" ON "MusicMapAnchor"("musicMapVersionId", "position");

-- CreateIndex
CREATE INDEX "MusicMapAnchor_musicMapVersionId_kind_decision_idx" ON "MusicMapAnchor"("musicMapVersionId", "kind", "decision");

-- CreateIndex
CREATE INDEX "MusicMapAnchor_musicMapVersionId_startMs_idx" ON "MusicMapAnchor"("musicMapVersionId", "startMs");

-- AddForeignKey
ALTER TABLE "MusicMap" ADD CONSTRAINT "MusicMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicMapVersion" ADD CONSTRAINT "MusicMapVersion_musicMapId_fkey" FOREIGN KEY ("musicMapId") REFERENCES "MusicMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicMapVersion" ADD CONSTRAINT "MusicMapVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicMapVersion" ADD CONSTRAINT "MusicMapVersion_sourceAnalysisVersionId_fkey" FOREIGN KEY ("sourceAnalysisVersionId") REFERENCES "MusicAnalysisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicMapVersion" ADD CONSTRAINT "MusicMapVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicMapAnchor" ADD CONSTRAINT "MusicMapAnchor_musicMapVersionId_fkey" FOREIGN KEY ("musicMapVersionId") REFERENCES "MusicMapVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
