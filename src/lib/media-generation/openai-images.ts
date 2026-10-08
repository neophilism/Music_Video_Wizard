import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import { MediaProviderError } from "./errors";
import type {
  MediaGenerationAdapter,
  MediaGenerationSubmission,
  MediaModelDescriptor
} from "./types";

interface OpenAIImagePayload{
  created?:number;
  data?:Array<{
    b64_json?:string;
    revised_prompt?:string;
  }>;
  usage?:unknown;
}

const MODELS:readonly MediaModelDescriptor[]=[
  {
    providerId:"openai-images",
    modelId:"gpt-image-2.5-sunburst",
    enabled:true,
    priority:10,
    capabilities:{
      textToImage:true,
      imageEditing:false,
      imageToVideo:false,
      referenceImages:false,
      firstFrame:false,
      lastFrame:false,
      minDurationMs:1,
      maxDurationMs:Number.MAX_SAFE_INTEGER,
      aspectRatios:[],
      resolutions:[]
    }
  },
  {
    providerId:"openai-images",
    modelId:"gpt-image-2.5-flare",
    enabled:true,
    priority:20,
    capabilities:{
      textToImage:true,
      imageEditing:false,
      imageToVideo:false,
      referenceImages:false,
      firstFrame:false,
      lastFrame:false,
      minDurationMs:1,
      maxDurationMs:Number.MAX_SAFE_INTEGER,
      aspectRatios:[],
      resolutions:[]
    }
  }
];

function isPermanentHttpStatus(status:number){
  if(status===408||status===409||status===429) return false;
  return status>=400&&status<500;
}

function roundTo16(value:number){
  return Math.max(16,Math.round(value/16)*16);
}

export function openAIImageSizeForAspectRatio(aspectRatio:string):string{
  const match=/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(aspectRatio);
  if(!match) throw new MediaProviderError(
    "OpenAI image generation requires an aspect ratio in W:H form.",
    true
  );
  const width=Number(match[1]);
  const height=Number(match[2]);
  const ratio=width/height;
  if(!Number.isFinite(ratio)||ratio<1/3||ratio>3){
    throw new MediaProviderError(
      "OpenAI image generation supports aspect ratios from 1:3 through 3:1.",
      true
    );
  }

  if(Math.abs(ratio-1)<0.01) return "1024x1024";
  if(ratio>1){
    return "1536x"+roundTo16(1536/ratio);
  }
  return roundTo16(1536*ratio)+"x1536";
}

function providerPrompt(request:CompiledGenerationRequest):string{
  const negatives=request.negativeConstraints.length
    ?"\n\nHard exclusions:\n- "+request.negativeConstraints.join("\n- ")
    :"";
  const prompt=request.prompt+negatives;
  if(prompt.length>32000){
    throw new MediaProviderError(
      "Compiled image prompt exceeds the OpenAI Images API 32,000-character limit.",
      true
    );
  }
  return prompt;
}

export class OpenAIImageAdapter implements MediaGenerationAdapter{
  readonly providerId="openai-images";

  constructor(
    private readonly apiKey:string,
    private readonly baseUrl:string
  ){}

  async listModels():Promise<MediaModelDescriptor[]>{
    return MODELS.map(model=>({
      ...model,
      capabilities:{
        ...model.capabilities,
        aspectRatios:[...model.capabilities.aspectRatios],
        resolutions:[...model.capabilities.resolutions]
      }
    }));
  }

  async submit(input:{
    model:MediaModelDescriptor;
    request:CompiledGenerationRequest;
  }):Promise<MediaGenerationSubmission>{
    if(input.model.providerId!==this.providerId){
      throw new MediaProviderError(
        "The selected model does not belong to the OpenAI Images adapter.",
        true
      );
    }
    if(input.request.mediaKind!=="IMAGE"){
      throw new MediaProviderError(
        "The OpenAI Images adapter only accepts IMAGE requests.",
        true
      );
    }

    const body={
      model:input.model.modelId,
      prompt:providerPrompt(input.request),
      n:1,
      size:openAIImageSizeForAspectRatio(input.request.aspectRatio),
      quality:"high",
      output_format:"png",
      background:"opaque"
    };

    let response:Response;
    try{
      response=await fetch(
        this.baseUrl.replace(/\/$/,"")+"/v1/images/generations",
        {
          method:"POST",
          headers:{
            authorization:"Bearer "+this.apiKey,
            "content-type":"application/json"
          },
          body:JSON.stringify(body)
        }
      );
    }catch(error){
      throw new MediaProviderError(
        error instanceof Error
          ?"OpenAI Images request failed: "+error.message
          :"OpenAI Images request failed.",
        false
      );
    }

    if(!response.ok){
      const detail=(await response.text()).slice(0,2000);
      throw new MediaProviderError(
        "OpenAI Images API returned HTTP "+response.status+
          (detail?": "+detail:""),
        isPermanentHttpStatus(response.status),
        response.status
      );
    }

    const payload=(await response.json()) as OpenAIImagePayload;
    const encoded=payload.data?.[0]?.b64_json;
    if(!encoded){
      throw new MediaProviderError(
        "OpenAI Images API returned no image data.",
        true
      );
    }

    return {
      providerId:this.providerId,
      modelId:input.model.modelId,
      externalJobId:null,
      requestSnapshot:body,
      immediateResult:{
        externalJobId:null,
        status:"SUCCEEDED",
        outputs:[{
          kind:"INLINE_BASE64",
          contentType:"image/png",
          base64:encoded
        }],
        providerSnapshot:{
          created:payload.created,
          revisedPrompt:payload.data?.[0]?.revised_prompt,
          usage:payload.usage
        }
      }
    };
  }

  async poll():Promise<never>{
    throw new MediaProviderError(
      "OpenAI image generation is synchronous and does not expose a pollable job ID.",
      true
    );
  }
}
