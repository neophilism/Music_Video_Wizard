-- AlterEnum
ALTER TYPE "DomainVersionKind" ADD VALUE 'CREATIVE_KIT';

-- CreateTable
CREATE TABLE "CreativeKit" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeKitVersion" (
    "id" UUID NOT NULL,
    "creativeKitId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CreativeKitVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeKitItem" (
    "id" UUID NOT NULL,
    "creativeKitVersionId" UUID NOT NULL,
    "creativeModuleVersionId" UUID NOT NULL,
    "slot" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreativeKitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreativeKit_workspaceId_updatedAt_idx" ON "CreativeKit"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeKitVersion_nodeId_key" ON "CreativeKitVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeKitVersion_creativeKitId_versionNumber_key" ON "CreativeKitVersion"("creativeKitId", "versionNumber");

-- CreateIndex
CREATE INDEX "CreativeKitVersion_creativeKitId_lifecycle_idx" ON "CreativeKitVersion"("creativeKitId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeKitItem_creativeKitVersionId_slot_key" ON "CreativeKitItem"("creativeKitVersionId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeKitItem_creativeKitVersionId_position_key" ON "CreativeKitItem"("creativeKitVersionId", "position");

-- CreateIndex
CREATE INDEX "CreativeKitItem_creativeModuleVersionId_idx" ON "CreativeKitItem"("creativeModuleVersionId");

-- AddForeignKey
ALTER TABLE "CreativeKit" ADD CONSTRAINT "CreativeKit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeKitVersion" ADD CONSTRAINT "CreativeKitVersion_creativeKitId_fkey" FOREIGN KEY ("creativeKitId") REFERENCES "CreativeKit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeKitVersion" ADD CONSTRAINT "CreativeKitVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeKitVersion" ADD CONSTRAINT "CreativeKitVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeKitItem" ADD CONSTRAINT "CreativeKitItem_creativeKitVersionId_fkey" FOREIGN KEY ("creativeKitVersionId") REFERENCES "CreativeKitVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeKitItem" ADD CONSTRAINT "CreativeKitItem_creativeModuleVersionId_fkey" FOREIGN KEY ("creativeModuleVersionId") REFERENCES "CreativeModuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
