import { z } from "zod";

export const prepareRenderManifestSchema=z.object({
  expectedWizardRevision:z.number().int().min(0)
}).strict();
