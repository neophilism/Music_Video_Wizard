import type { AppEnvironment } from "@/lib/env";
import { OpenAIImageAdapter } from "./openai-images";
import { RunwayVideoAdapter } from "./runway-video";
import type { MediaGenerationAdapter } from "./types";

export function getConfiguredMediaGenerationAdapters(
  env:AppEnvironment
):MediaGenerationAdapter[]{
  const adapters:MediaGenerationAdapter[]=[];

  if(env.IMAGE_GENERATION_PROVIDER==="openai"){
    if(!env.OPENAI_API_KEY){
      throw new Error("OpenAI image generation requires OPENAI_API_KEY.");
    }
    adapters.push(
      new OpenAIImageAdapter(env.OPENAI_API_KEY,env.OPENAI_BASE_URL)
    );
  }

  if(env.VIDEO_GENERATION_PROVIDER==="runway"){
    if(!env.RUNWAY_API_SECRET){
      throw new Error("Runway video generation requires RUNWAY_API_SECRET.");
    }
    adapters.push(
      new RunwayVideoAdapter(
        env.RUNWAY_API_SECRET,
        env.RUNWAY_BASE_URL,
        env.RUNWAY_API_VERSION
      )
    );
  }

  return adapters;
}
