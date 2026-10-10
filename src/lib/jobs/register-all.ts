import { registerBuiltInGenerationHandlers } from "@/lib/music-analysis/register";
import { registerConceptGenerationHandlers } from "@/lib/concepts/register";
import { registerTreatmentGenerationHandlers } from "@/lib/treatment/register";
import { registerCreativeLanguageGenerationHandlers } from "@/lib/creative-language/register";
import { registerSongPicturePlanGenerationHandlers } from "@/lib/song-picture-plan/register";
import { registerStoryboardGenerationHandlers } from "@/lib/storyboard/register";
import { registerShotSpecificationsGenerationHandlers } from "@/lib/shot-specifications/register";
import { registerInitialFrameGenerationHandlers } from "@/lib/initial-frames/register";
import { registerVideoClipGenerationHandlers } from "@/lib/video-clips/register";
import { registerFinalMasterRenderHandler } from "@/lib/finish-export/register";

let registered = false;

export function registerAllGenerationHandlers(): void {
  if (registered) return;
  registerBuiltInGenerationHandlers();
  registerConceptGenerationHandlers();
  registerTreatmentGenerationHandlers();
  registerCreativeLanguageGenerationHandlers();
  registerSongPicturePlanGenerationHandlers();
  registerStoryboardGenerationHandlers();
  registerShotSpecificationsGenerationHandlers();
  registerInitialFrameGenerationHandlers();
  registerVideoClipGenerationHandlers();
  registerFinalMasterRenderHandler();
  registered = true;
}
