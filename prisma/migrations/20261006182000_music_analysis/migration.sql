-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'MUSIC_ANALYSIS';

-- CreateTable
CREATE TABLE "MusicAnalysis" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicAnalysisVersion" (
    "id" UUID NOT NULL,
    "musicAnalysisId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'LOCKED',
    "audioAssetVersionId" UUID NOT NULL,
    "generationJobId" UUID,
    "engineKey" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "transcriptionProvider" TEXT,
    "transcriptionModel" TEXT,
    "durationMs" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicAnalysisVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicAnalysis_projectId_key" ON "MusicAnalysis"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicAnalysisVersion_nodeId_key" ON "MusicAnalysisVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicAnalysisVersion_generationJobId_key" ON "MusicAnalysisVersion"("generationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicAnalysisVersion_musicAnalysisId_versionNumber_key" ON "MusicAnalysisVersion"("musicAnalysisId", "versionNumber");

-- CreateIndex
CREATE INDEX "MusicAnalysisVersion_audioAssetVersionId_createdAt_idx" ON "MusicAnalysisVersion"("audioAssetVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "MusicAnalysisVersion_musicAnalysisId_createdAt_idx" ON "MusicAnalysisVersion"("musicAnalysisId", "createdAt");

-- AddForeignKey
ALTER TABLE "MusicAnalysis" ADD CONSTRAINT "MusicAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAnalysisVersion" ADD CONSTRAINT "MusicAnalysisVersion_musicAnalysisId_fkey" FOREIGN KEY ("musicAnalysisId") REFERENCES "MusicAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAnalysisVersion" ADD CONSTRAINT "MusicAnalysisVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAnalysisVersion" ADD CONSTRAINT "MusicAnalysisVersion_audioAssetVersionId_fkey" FOREIGN KEY ("audioAssetVersionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAnalysisVersion" ADD CONSTRAINT "MusicAnalysisVersion_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAnalysisVersion" ADD CONSTRAINT "MusicAnalysisVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
