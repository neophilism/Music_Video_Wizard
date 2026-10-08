import type { AppEnvironment } from "@/lib/env";
import { OpenAIImageAdapter } from "./openai-images";
import type { MediaGenerationAdapter } from "./types";

export function getConfiguredMediaGenerationAdapters(
  env:AppEnvironment
):MediaGenerationAdapter[]{
  if(env.IMAGE_GENERATION_PROVIDER==="none") return [];
  if(env.IMAGE_GENERATION_PROVIDER==="openai"){
    if(!env.OPENAI_API_KEY){
      throw new Error("OpenAI image generation requires OPENAI_API_KEY.");
    }
    return [new OpenAIImageAdapter(env.OPENAI_API_KEY,env.OPENAI_BASE_URL)];
  }
  return [];
}
