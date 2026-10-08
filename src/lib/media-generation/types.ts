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

export interface MediaGenerationSubmission{
  providerId:string;
  modelId:string;
  externalJobId:string;
  requestSnapshot:unknown;
}

export interface MediaGenerationResult{
  externalJobId:string;
  status:"QUEUED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELED";
  outputUrls:string[];
  errorMessage?:string;
  providerSnapshot?:unknown;
}

export interface MediaGenerationAdapter{
  providerId:string;
  listModels():Promise<MediaModelDescriptor[]>;
  submit(input:{
    model:MediaModelDescriptor;
    request:CompiledGenerationRequest;
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
