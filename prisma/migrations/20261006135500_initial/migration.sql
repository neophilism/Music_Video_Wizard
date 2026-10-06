-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "VersionLifecycle" AS ENUM ('DRAFT', 'LOCKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "DomainVersionKind" AS ENUM ('PROJECT', 'SEQUENCE', 'SHOT', 'CREATIVE_MODULE', 'ASSET', 'TIMELINE');

-- CreateEnum
CREATE TYPE "CreativeModuleKind" AS ENUM ('VISUAL_AESTHETIC', 'COLOR_LIGHTING', 'CHARACTER', 'WARDROBE', 'LOCATION_WORLD', 'PROP', 'CINEMATOGRAPHY_GRAMMAR', 'COMPOSITION_GRAMMAR', 'MOTION_GRAMMAR', 'PERFORMANCE_GRAMMAR', 'EDITING_GRAMMAR', 'TRANSITION_GRAMMAR', 'PACING_CURVE', 'NARRATIVE_TEMPLATE', 'MOTIF', 'IMAGE_PROMPT_MODULE', 'NEGATIVE_PROMPT_MODULE', 'VIDEO_PROMPT_MODULE', 'GENERATION_RECIPE', 'TYPOGRAPHY_KIT', 'OUTPUT_PRESET', 'STORYBOARD_PATTERN', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('AUDIO_MASTER', 'REFERENCE_IMAGE', 'STORYBOARD_IMAGE', 'GENERATED_IMAGE', 'GENERATED_VIDEO', 'GRAPHIC', 'TITLE_CARD', 'RENDER_PREVIEW', 'RENDER_MASTER', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "GenerationKind" AS ENUM ('IMAGE', 'VIDEO', 'ANALYSIS', 'TEXT', 'RENDER', 'OTHER');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DependencyRelation" AS ENUM ('DERIVED_FROM', 'REFERENCES', 'GENERATED_FROM', 'COMPILED_FROM', 'RENDERED_FROM');

-- CreateEnum
CREATE TYPE "TimelineKind" AS ENUM ('FIRST_CUT', 'WORKING', 'ALTERNATE', 'EXPORT');

-- CreateEnum
CREATE TYPE "TimelineTrackKind" AS ENUM ('VIDEO', 'GRAPHIC', 'TITLE');

-- CreateEnum
CREATE TYPE "TimelineItemOrigin" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "aspectRatio" TEXT,
    "outputWidth" INTEGER,
    "outputHeight" INTEGER,
    "frameRate" DOUBLE PRECISION,
    "audioMasterAssetVersionId" UUID,
    "specification" JSONB,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceVersion" (
    "id" UUID NOT NULL,
    "sequenceId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "purpose" TEXT,
    "musicStartMs" INTEGER,
    "musicEndMs" INTEGER,
    "structuredSpec" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "SequenceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVersionSequence" (
    "id" UUID NOT NULL,
    "projectVersionId" UUID NOT NULL,
    "sequenceVersionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ProjectVersionSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShotVersion" (
    "id" UUID NOT NULL,
    "shotId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "label" TEXT,
    "plannedStartMs" INTEGER,
    "plannedEndMs" INTEGER,
    "dramaticPurpose" TEXT,
    "subject" TEXT,
    "locationDescription" TEXT,
    "action" TEXT,
    "composition" TEXT,
    "framing" TEXT,
    "cameraAngle" TEXT,
    "lens" TEXT,
    "lighting" TEXT,
    "colorTreatment" TEXT,
    "cameraMotion" TEXT,
    "subjectMotion" TEXT,
    "continuityNotes" TEXT,
    "wardrobeNotes" TEXT,
    "propsNotes" TEXT,
    "transitionIn" TEXT,
    "transitionOut" TEXT,
    "imageInstructions" TEXT,
    "videoInstructions" TEXT,
    "negativeInstructions" TEXT,
    "generationHandlesMs" INTEGER,
    "structuredSpec" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ShotVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceVersionShot" (
    "id" UUID NOT NULL,
    "sequenceVersionId" UUID NOT NULL,
    "shotVersionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SequenceVersionShot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeModule" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "kind" "CreativeModuleKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeModuleVersion" (
    "id" UUID NOT NULL,
    "creativeModuleId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "positivePrompt" TEXT,
    "negativePrompt" TEXT,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "CreativeModuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeModuleReference" (
    "id" UUID NOT NULL,
    "creativeModuleVersionId" UUID NOT NULL,
    "assetVersionId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreativeModuleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeBinding" (
    "id" UUID NOT NULL,
    "scopeNodeId" UUID NOT NULL,
    "creativeModuleVersionId" UUID NOT NULL,
    "slot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" BIGINT,
    "checksumSha256" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "frameRate" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),

    CONSTRAINT "AssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "kind" "GenerationKind" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerKey" TEXT NOT NULL,
    "modelKey" TEXT,
    "requestSnapshot" JSONB NOT NULL,
    "responseMetadata" JSONB,
    "errorMessage" TEXT,
    "requestedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationInput" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GenerationInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationOutput" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GenerationOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timeline" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "kind" "TimelineKind" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineVersion" (
    "id" UUID NOT NULL,
    "timelineId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "VersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "basisProjectVersionId" UUID NOT NULL,
    "audioMasterAssetVersionId" UUID NOT NULL,
    "parentTimelineVersionId" UUID,
    "compiledAutomatically" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "TimelineVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" UUID NOT NULL,
    "timelineVersionId" UUID NOT NULL,
    "trackKind" "TimelineTrackKind" NOT NULL,
    "trackIndex" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL,
    "origin" "TimelineItemOrigin" NOT NULL DEFAULT 'AUTOMATIC',
    "shotVersionId" UUID,
    "assetVersionId" UUID,
    "timelineStartMs" INTEGER NOT NULL,
    "timelineEndMs" INTEGER NOT NULL,
    "sourceStartMs" INTEGER NOT NULL DEFAULT 0,
    "sourceEndMs" INTEGER,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "parameters" JSONB,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineTransition" (
    "id" UUID NOT NULL,
    "timelineVersionId" UUID NOT NULL,
    "fromItemId" UUID NOT NULL,
    "toItemId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "parameters" JSONB,

    CONSTRAINT "TimelineTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainVersionNode" (
    "id" UUID NOT NULL,
    "kind" "DomainVersionKind" NOT NULL,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainVersionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyEdge" (
    "id" UUID NOT NULL,
    "upstreamNodeId" UUID NOT NULL,
    "downstreamNodeId" UUID NOT NULL,
    "relation" "DependencyRelation" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependencyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Verification_expiresAt_idx" ON "Verification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_nodeId_key" ON "ProjectVersion"("nodeId");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_lifecycle_idx" ON "ProjectVersion"("projectId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_versionNumber_key" ON "ProjectVersion"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "Sequence_projectId_idx" ON "Sequence"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceVersion_nodeId_key" ON "SequenceVersion"("nodeId");

-- CreateIndex
CREATE INDEX "SequenceVersion_sequenceId_lifecycle_idx" ON "SequenceVersion"("sequenceId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceVersion_sequenceId_versionNumber_key" ON "SequenceVersion"("sequenceId", "versionNumber");

-- CreateIndex
CREATE INDEX "ProjectVersionSequence_sequenceVersionId_idx" ON "ProjectVersionSequence"("sequenceVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersionSequence_projectVersionId_position_key" ON "ProjectVersionSequence"("projectVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersionSequence_projectVersionId_sequenceVersionId_key" ON "ProjectVersionSequence"("projectVersionId", "sequenceVersionId");

-- CreateIndex
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ShotVersion_nodeId_key" ON "ShotVersion"("nodeId");

-- CreateIndex
CREATE INDEX "ShotVersion_shotId_lifecycle_idx" ON "ShotVersion"("shotId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "ShotVersion_shotId_versionNumber_key" ON "ShotVersion"("shotId", "versionNumber");

-- CreateIndex
CREATE INDEX "SequenceVersionShot_shotVersionId_idx" ON "SequenceVersionShot"("shotVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceVersionShot_sequenceVersionId_position_key" ON "SequenceVersionShot"("sequenceVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceVersionShot_sequenceVersionId_shotVersionId_key" ON "SequenceVersionShot"("sequenceVersionId", "shotVersionId");

-- CreateIndex
CREATE INDEX "CreativeModule_workspaceId_kind_idx" ON "CreativeModule"("workspaceId", "kind");

-- CreateIndex
CREATE INDEX "CreativeModule_workspaceId_updatedAt_idx" ON "CreativeModule"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeModuleVersion_nodeId_key" ON "CreativeModuleVersion"("nodeId");

-- CreateIndex
CREATE INDEX "CreativeModuleVersion_creativeModuleId_lifecycle_idx" ON "CreativeModuleVersion"("creativeModuleId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeModuleVersion_creativeModuleId_versionNumber_key" ON "CreativeModuleVersion"("creativeModuleId", "versionNumber");

-- CreateIndex
CREATE INDEX "CreativeModuleReference_assetVersionId_idx" ON "CreativeModuleReference"("assetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeModuleReference_creativeModuleVersionId_role_positi_key" ON "CreativeModuleReference"("creativeModuleVersionId", "role", "position");

-- CreateIndex
CREATE INDEX "CreativeBinding_creativeModuleVersionId_idx" ON "CreativeBinding"("creativeModuleVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeBinding_scopeNodeId_slot_key" ON "CreativeBinding"("scopeNodeId", "slot");

-- CreateIndex
CREATE INDEX "Asset_workspaceId_kind_idx" ON "Asset"("workspaceId", "kind");

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_nodeId_key" ON "AssetVersion"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_storageKey_key" ON "AssetVersion"("storageKey");

-- CreateIndex
CREATE INDEX "AssetVersion_assetId_status_idx" ON "AssetVersion"("assetId", "status");

-- CreateIndex
CREATE INDEX "AssetVersion_checksumSha256_idx" ON "AssetVersion"("checksumSha256");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_assetId_versionNumber_key" ON "AssetVersion"("assetId", "versionNumber");

-- CreateIndex
CREATE INDEX "GenerationJob_workspaceId_createdAt_idx" ON "GenerationJob"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_idx" ON "GenerationJob"("projectId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationInput_nodeId_idx" ON "GenerationInput"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationInput_jobId_role_position_key" ON "GenerationInput"("jobId", "role", "position");

-- CreateIndex
CREATE INDEX "GenerationOutput_nodeId_idx" ON "GenerationOutput"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationOutput_jobId_role_position_key" ON "GenerationOutput"("jobId", "role", "position");

-- CreateIndex
CREATE INDEX "Timeline_projectId_kind_idx" ON "Timeline"("projectId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineVersion_nodeId_key" ON "TimelineVersion"("nodeId");

-- CreateIndex
CREATE INDEX "TimelineVersion_timelineId_lifecycle_idx" ON "TimelineVersion"("timelineId", "lifecycle");

-- CreateIndex
CREATE INDEX "TimelineVersion_basisProjectVersionId_idx" ON "TimelineVersion"("basisProjectVersionId");

-- CreateIndex
CREATE INDEX "TimelineVersion_parentTimelineVersionId_idx" ON "TimelineVersion"("parentTimelineVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineVersion_timelineId_versionNumber_key" ON "TimelineVersion"("timelineId", "versionNumber");

-- CreateIndex
CREATE INDEX "TimelineItem_timelineVersionId_timelineStartMs_idx" ON "TimelineItem"("timelineVersionId", "timelineStartMs");

-- CreateIndex
CREATE INDEX "TimelineItem_shotVersionId_idx" ON "TimelineItem"("shotVersionId");

-- CreateIndex
CREATE INDEX "TimelineItem_assetVersionId_idx" ON "TimelineItem"("assetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineItem_timelineVersionId_trackKind_trackIndex_positio_key" ON "TimelineItem"("timelineVersionId", "trackKind", "trackIndex", "position");

-- CreateIndex
CREATE INDEX "TimelineTransition_fromItemId_idx" ON "TimelineTransition"("fromItemId");

-- CreateIndex
CREATE INDEX "TimelineTransition_toItemId_idx" ON "TimelineTransition"("toItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineTransition_timelineVersionId_fromItemId_toItemId_key" ON "TimelineTransition"("timelineVersionId", "fromItemId", "toItemId");

-- CreateIndex
CREATE INDEX "DomainVersionNode_kind_createdAt_idx" ON "DomainVersionNode"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "DomainVersionNode_fingerprint_idx" ON "DomainVersionNode"("fingerprint");

-- CreateIndex
CREATE INDEX "DependencyEdge_downstreamNodeId_idx" ON "DependencyEdge"("downstreamNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "DependencyEdge_upstreamNodeId_downstreamNodeId_relation_key" ON "DependencyEdge"("upstreamNodeId", "downstreamNodeId", "relation");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_audioMasterAssetVersionId_fkey" FOREIGN KEY ("audioMasterAssetVersionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceVersion" ADD CONSTRAINT "SequenceVersion_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceVersion" ADD CONSTRAINT "SequenceVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceVersion" ADD CONSTRAINT "SequenceVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersionSequence" ADD CONSTRAINT "ProjectVersionSequence_projectVersionId_fkey" FOREIGN KEY ("projectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersionSequence" ADD CONSTRAINT "ProjectVersionSequence_sequenceVersionId_fkey" FOREIGN KEY ("sequenceVersionId") REFERENCES "SequenceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotVersion" ADD CONSTRAINT "ShotVersion_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotVersion" ADD CONSTRAINT "ShotVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotVersion" ADD CONSTRAINT "ShotVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceVersionShot" ADD CONSTRAINT "SequenceVersionShot_sequenceVersionId_fkey" FOREIGN KEY ("sequenceVersionId") REFERENCES "SequenceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceVersionShot" ADD CONSTRAINT "SequenceVersionShot_shotVersionId_fkey" FOREIGN KEY ("shotVersionId") REFERENCES "ShotVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModule" ADD CONSTRAINT "CreativeModule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModuleVersion" ADD CONSTRAINT "CreativeModuleVersion_creativeModuleId_fkey" FOREIGN KEY ("creativeModuleId") REFERENCES "CreativeModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModuleVersion" ADD CONSTRAINT "CreativeModuleVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModuleVersion" ADD CONSTRAINT "CreativeModuleVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModuleReference" ADD CONSTRAINT "CreativeModuleReference_creativeModuleVersionId_fkey" FOREIGN KEY ("creativeModuleVersionId") REFERENCES "CreativeModuleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeModuleReference" ADD CONSTRAINT "CreativeModuleReference_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBinding" ADD CONSTRAINT "CreativeBinding_scopeNodeId_fkey" FOREIGN KEY ("scopeNodeId") REFERENCES "DomainVersionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeBinding" ADD CONSTRAINT "CreativeBinding_creativeModuleVersionId_fkey" FOREIGN KEY ("creativeModuleVersionId") REFERENCES "CreativeModuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationInput" ADD CONSTRAINT "GenerationInput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationInput" ADD CONSTRAINT "GenerationInput_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationOutput" ADD CONSTRAINT "GenerationOutput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationOutput" ADD CONSTRAINT "GenerationOutput_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "DomainVersionNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_basisProjectVersionId_fkey" FOREIGN KEY ("basisProjectVersionId") REFERENCES "ProjectVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_audioMasterAssetVersionId_fkey" FOREIGN KEY ("audioMasterAssetVersionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineVersion" ADD CONSTRAINT "TimelineVersion_parentTimelineVersionId_fkey" FOREIGN KEY ("parentTimelineVersionId") REFERENCES "TimelineVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_timelineVersionId_fkey" FOREIGN KEY ("timelineVersionId") REFERENCES "TimelineVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_shotVersionId_fkey" FOREIGN KEY ("shotVersionId") REFERENCES "ShotVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_assetVersionId_fkey" FOREIGN KEY ("assetVersionId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineTransition" ADD CONSTRAINT "TimelineTransition_timelineVersionId_fkey" FOREIGN KEY ("timelineVersionId") REFERENCES "TimelineVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineTransition" ADD CONSTRAINT "TimelineTransition_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineTransition" ADD CONSTRAINT "TimelineTransition_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_upstreamNodeId_fkey" FOREIGN KEY ("upstreamNodeId") REFERENCES "DomainVersionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_downstreamNodeId_fkey" FOREIGN KEY ("downstreamNodeId") REFERENCES "DomainVersionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

##[group]Run npm run db:generate
[36;1mnpm run db:generate[0m
shell: /usr/bin/bash -e {0}
env:
  DATABASE_URL: ***localhost:5432/ci
  BETTER_AUTH_SECRET: 0123456789abcdef0123456789abcdef
  BETTER_AUTH_URL: http://localhost:3000
  ASSET_STORAGE_DRIVER: local
  ASSET_STORAGE_BUCKET: ci-assets
