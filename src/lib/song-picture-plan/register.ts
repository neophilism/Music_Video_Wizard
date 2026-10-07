import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleSongPicturePlanGeneration } from "./handler";

let registered=false;
export function registerSongPicturePlanGenerationHandlers(){
  if(registered) return;
  generationHandlers.register(GenerationKind.TEXT,"openai-responses:song-picture-plan",handleSongPicturePlanGeneration);
  registered=true;
}
