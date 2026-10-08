import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";

export interface MediaModelCapabilities{
  textToImage:boolean;
  imageEditing:boolean;
  imageToVideo:boolean;
  referenceImages:boolean;
  firstFrame:boolean;
  lastFrame:boolean;
  minDurationMs:number;
  maxDurationMs:number;
  aspectRatios:string[];
  resolutions:string[];
}

export interface MediaModelDescriptor{
  providerId:string;
  modelId:string;
  enabled:boolean;
  priority:number;
  capabilities:MediaModelCapabilities;
}

export interface MediaGenerationOutput{
  kind:"INLINE_BASE64"|"REMOTE_URL";
  contentType:string;
  base64?:string;
  url?:string;
}

export interface MediaGenerationResult{
  externalJobId:string|null;
  status:"QUEUED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELED";
  outputs:MediaGenerationOutput[];
  errorMessage?:string;
  providerSnapshot?:unknown;
}

export interface MediaGenerationReference{
  role:"SUBJECT"|"WARDROBE"|"PROP"|"ENVIRONMENT"|"STYLE"|"FIRST_FRAME"|"LAST_FRAME";
  contentType?:string;
  url?:string;
  dataUri?:string;
}

export interface MediaGenerationSubmission{
  providerId:string;
  modelId:string;
  externalJobId:string|null;
  requestSnapshot:unknown;
  immediateResult?:MediaGenerationResult;
}

export interface MediaGenerationAdapter{
  providerId:string;
  listModels():Promise<MediaModelDescriptor[]>;
  submit(input:{
    model:MediaModelDescriptor;
    request:CompiledGenerationRequest;
    references?:MediaGenerationReference[];
  }):Promise<MediaGenerationSubmission>;
  poll(input:{
    model:MediaModelDescriptor;
    externalJobId:string;
  }):Promise<MediaGenerationResult>;
  cancel?(input:{
    model:MediaModelDescriptor;
    externalJobId:string;
  }):Promise<void>;
}
