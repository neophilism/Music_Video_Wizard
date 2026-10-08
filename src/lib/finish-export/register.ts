import { GenerationKind } from "@prisma/client";
import { generationHandlers } from "@/lib/jobs/registry";
import { handleFinalMasterRender } from "./handler";

let registered=false;

export function registerFinalMasterRenderHandler(){
  if(registered) return;
  generationHandlers.register(
    GenerationKind.RENDER,
    "ffmpeg:finish-export",
    handleFinalMasterRender
  );
  registered=true;
}
