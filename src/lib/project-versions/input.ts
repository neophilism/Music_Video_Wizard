import { z } from "zod";

export const forkProjectVersionSchema=z.object({
  action:z.literal("fork"),
  sourceProjectVersionId:z.string().uuid().optional(),
  branchName:z.string().trim().min(1).max(80),
  forkStepKey:z.string().trim().min(1).max(80)
}).strict();

export const switchProjectVersionSchema=z.object({
  action:z.literal("switch"),
  projectVersionId:z.string().uuid()
}).strict();

export const projectVersionActionSchema=z.discriminatedUnion("action",[
  forkProjectVersionSchema,
  switchProjectVersionSchema
]);

export const compareProjectVersionsSchema=z.object({
  left:z.string().uuid(),
  right:z.string().uuid()
}).strict();
