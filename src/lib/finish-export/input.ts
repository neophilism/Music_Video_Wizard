import { z } from "zod";

const revision=z.number().int().min(0);
const uuid=z.string().uuid();

export const prepareRenderManifestSchema=z.object({
  expectedWizardRevision:revision
}).strict();

export const queueMasterRenderSchema=z.object({
  expectedWizardRevision:revision
}).strict();

export const renderManifestSchema=z.object({
  schemaVersion:z.literal(1),
  projectVersionId:uuid,
  sourceTimelineVersionId:uuid,
  sourceTimelineNodeId:uuid,
  audioMasterAssetVersionId:uuid,
  audioMasterNodeId:uuid,
  output:z.object({
    width:z.number().int().positive(),
    height:z.number().int().positive(),
    frameRate:z.number().positive(),
    aspectRatio:z.string().min(1),
    container:z.literal("mp4"),
    videoCodec:z.literal("h264"),
    audioCodec:z.literal("aac"),
    pixelFormat:z.literal("yuv420p")
  }).strict(),
  durationMs:z.number().int().positive(),
  expectedFrameCount:z.number().int().positive(),
  items:z.array(z.object({
    position:z.number().int().min(0),
    shotVersionId:uuid,
    clipAssetVersionId:uuid,
    clipNodeId:uuid,
    timelineStartMs:z.number().int().min(0),
    timelineEndMs:z.number().int().positive(),
    sourceStartMs:z.number().int().min(0),
    sourceEndMs:z.number().int().positive()
  }).strict()).min(1),
  transitions:z.array(z.object({
    fromPosition:z.number().int().min(0),
    toPosition:z.number().int().positive(),
    kind:z.string().min(1),
    durationMs:z.number().int().min(0),
    parameters:z.unknown()
  }).strict())
}).strict();

export const queuedMasterRenderSchema=z.object({
  schemaVersion:z.literal(1),
  projectId:uuid,
  renderAssetId:uuid,
  manifest:renderManifestSchema,
  manifestFingerprint:z.string().min(1)
}).strict();

export type QueuedMasterRender=z.infer<typeof queuedMasterRenderSchema>;
