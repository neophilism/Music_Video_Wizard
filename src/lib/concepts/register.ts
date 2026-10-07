import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleConceptGeneration } from "./handler";

let registered = false;

export function registerConceptGenerationHandlers() {
  if (registered) return;

  generationHandlers.register(
    GenerationKind.TEXT,
    "openai-responses",
    handleConceptGeneration
  );

  registered = true;
}
