import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleStoryboardGeneration } from "./handler";

let registered=false;

export function registerStoryboardGenerationHandlers(){
  if(registered) return;
  generationHandlers.register(
    GenerationKind.TEXT,
    "openai-responses:storyboard",
    handleStoryboardGeneration
  );
  registered=true;
}
