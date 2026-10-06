import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleLocalMusicAnalysis } from "./handler";
import { MUSIC_ANALYSIS_PROVIDER_KEY } from "./service";

let registered = false;

export function registerBuiltInGenerationHandlers() {
  if (registered) return;

  generationHandlers.register(
    GenerationKind.ANALYSIS,
    MUSIC_ANALYSIS_PROVIDER_KEY,
    handleLocalMusicAnalysis
  );

  registered = true;
}
