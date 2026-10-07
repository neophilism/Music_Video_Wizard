import { z } from "zod";
import { songPicturePlanDraftSchema } from "./schema";

export const songPicturePlanActionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("initialize")}),
  z.object({action:z.literal("save"),songPicturePlanVersionId:z.string().uuid(),expectedRevision:z.number().int().min(0),document:songPicturePlanDraftSchema}),
  z.object({action:z.literal("complete"),songPicturePlanVersionId:z.string().uuid(),expectedRevision:z.number().int().min(0)}),
  z.object({action:z.literal("reopen"),songPicturePlanVersionId:z.string().uuid(),expectedRevision:z.number().int().min(0)}),
  z.object({action:z.literal("lock"),songPicturePlanVersionId:z.string().uuid(),expectedRevision:z.number().int().min(0)})
]);

export const songPicturePlanGenerationSchema=z.object({
  songPicturePlanVersionId:z.string().uuid(),
  expectedRevision:z.number().int().min(0),
  direction:z.string().trim().max(5000).default("")
});

export const queuedSongPicturePlanGenerationSchema=z.object({
  textOperation:z.literal("song-picture-plan"),
  projectId:z.string().uuid(),
  projectVersionId:z.string().uuid(),
  songPicturePlanVersionId:z.string().uuid(),
  treatmentVersionId:z.string().uuid(),
  creativeLanguageVersionId:z.string().uuid(),
  musicMapVersionId:z.string().uuid(),
  direction:z.string().max(5000)
});
