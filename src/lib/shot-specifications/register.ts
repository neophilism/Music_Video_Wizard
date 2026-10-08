import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleShotSpecificationsGeneration } from "./handler";

let registered=false;

export function registerShotSpecificationsGenerationHandlers(){
  if(registered) return;
  generationHandlers.register(
    GenerationKind.TEXT,
    "openai-responses:shot-specifications",
    handleShotSpecificationsGeneration
  );
  registered=true;
}
