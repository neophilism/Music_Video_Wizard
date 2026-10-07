import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleTreatmentGeneration } from "./handler";

let registered = false;

export function registerTreatmentGenerationHandlers() {
  if (registered) return;
  generationHandlers.register(
    GenerationKind.TEXT,
    "openai-responses:treatment",
    handleTreatmentGeneration
  );
  registered = true;
}
