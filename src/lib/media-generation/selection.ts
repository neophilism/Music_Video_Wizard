import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import type { MediaModelDescriptor } from "./types";

export interface ModelSelectionResult{
  model:MediaModelDescriptor|null;
  rejected:Array<{
    providerId:string;
    modelId:string;
    reasons:string[];
  }>;
}

export function modelRejectionReasons(
  model:MediaModelDescriptor,
  request:CompiledGenerationRequest
):string[]{
  const c=model.capabilities;
  const r=request.capabilityRequirements;
  const reasons:string[]=[];

  if(!model.enabled) reasons.push("model disabled");
  if(r.textToImage&&!c.textToImage) reasons.push("text-to-image unsupported");
  if(r.imageEditing&&!c.imageEditing) reasons.push("image editing unsupported");
  if(r.imageToVideo&&!c.imageToVideo) reasons.push("image-to-video unsupported");
  if(r.referenceImages&&!c.referenceImages) reasons.push("reference images unsupported");
  if(r.firstFrame&&!c.firstFrame) reasons.push("first frame unsupported");
  if(r.lastFrame&&!c.lastFrame) reasons.push("last frame unsupported");
  if(request.generationDurationMs>c.maxDurationMs) reasons.push("duration above model maximum");
  if(c.aspectRatios.length>0&&!c.aspectRatios.includes(request.aspectRatio)){
    reasons.push("aspect ratio unsupported");
  }
  return reasons;
}

export function selectMediaModel(
  models:readonly MediaModelDescriptor[],
  request:CompiledGenerationRequest
):ModelSelectionResult{
  const rejected:ModelSelectionResult["rejected"]=[];
  const compatible=models.filter(model=>{
    const reasons=modelRejectionReasons(model,request);
    if(reasons.length){
      rejected.push({providerId:model.providerId,modelId:model.modelId,reasons});
      return false;
    }
    return true;
  });

  compatible.sort((a,b)=>
    a.priority-b.priority||
    a.providerId.localeCompare(b.providerId)||
    a.modelId.localeCompare(b.modelId)
  );

  return {model:compatible[0]??null,rejected};
}

export function requireMediaModel(
  models:readonly MediaModelDescriptor[],
  request:CompiledGenerationRequest
):MediaModelDescriptor{
  const result=selectMediaModel(models,request);
  if(result.model) return result.model;
  const details=result.rejected.map(item=>
    item.providerId+"/"+item.modelId+": "+item.reasons.join(", ")
  ).join("; ");
  throw new Error(
    "No configured media generation model satisfies the compiled request"+
    (details?": "+details:"")
  );
}
