import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleCreativeLanguageGeneration } from "./handler";

let registered = false;

export function registerCreativeLanguageGenerationHandlers() {
  if (registered) return;
  generationHandlers.register(
    GenerationKind.TEXT,
    "openai-responses:creative-language",
    handleCreativeLanguageGeneration
  );
  registered = true;
}
