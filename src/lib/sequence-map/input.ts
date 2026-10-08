import { z } from "zod";
import { sequenceMapEditSchema } from "./schema";

export const sequenceMapActionSchema = z.discriminatedUnion("action",[
  z.object({action:z.literal("initialize")}).strict(),
  z.object({
    action:z.literal("save"),
    expectedWizardRevision:z.number().int().min(0),
    sequences:z.array(sequenceMapEditSchema).min(1).max(64)
  }).strict(),
  z.object({
    action:z.enum(["complete","reopen","lock"]),
    expectedWizardRevision:z.number().int().min(0)
  }).strict()
]);
