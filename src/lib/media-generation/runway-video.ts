import type { CompiledGenerationRequest } from "@/lib/prompt-compiler/schema";
import { MediaProviderError } from "./errors";
import type {
  MediaGenerationAdapter,
  MediaGenerationReference,
  MediaGenerationResult,
  MediaGenerationSubmission,
  MediaModelDescriptor
} from "./types";

interface RunwayCreateTaskResponse{
  id?:string;
}

interface RunwayTaskResponse{
  id?:string;
  status?:string;
  output?:string[];
  failure?:string;
  failureCode?:string|null;
  createdAt?:string;
}

const RATIO_MAP:Record<string,string>={
  "16:9":"1280:720",
  "9:16":"720:1280",
  "1:1":"960:960",
  "4:3":"1104:832",
  "3:4":"832:1104",
  "21:9":"1584:672"
};

const MODELS:MediaModelDescriptor[]=[
  {
    providerId:"runway",
    modelId:"gen4.5",
    enabled:true,
    priority:10,
    capabilities:{
      textToImage:false,
      imageEditing:false,
      imageToVideo:true,
      referenceImages:false,
      firstFrame:true,
      lastFrame:false,
      minDurationMs:2000,
      maxDurationMs:10000,
      aspectRatios:["16:9","9:16","1:1","4:3","3:4","21:9"],
      resolutions:["720p"]
    }
  },
  {
    providerId:"runway",
    modelId:"gen4_turbo",
    enabled:true,
    priority:20,
    capabilities:{
      textToImage:false,
      imageEditing:false,
      imageToVideo:true,
      referenceImages:false,
      firstFrame:true,
      lastFrame:false,
      minDurationMs:5000,
      maxDurationMs:10000,
      aspectRatios:["16:9","9:16"],
      resolutions:["720p"]
    }
  }
];

function permanentHttpStatus(status:number){
  if(status===408||status===409||status===429) return false;
  return status>=400&&status<500;
}

function firstFrame(
  references:readonly MediaGenerationReference[]|undefined
){
  return references?.find(reference=>reference.role==="FIRST_FRAME")??null;
}

function prompt(request:CompiledGenerationRequest){
  if(!request.negativeConstraints.length) return request.prompt;
  return request.prompt+
    "\n\nDo not introduce any of the following:\n- "+
    request.negativeConstraints.join("\n- ");
}

function durationSeconds(
  request:CompiledGenerationRequest,
  model:MediaModelDescriptor
){
  const desiredSeconds=Math.ceil(request.generationDurationMs/1000);
  // Gen-4 Turbo accepts only 5- or 10-second generations. Preserve the
  // exact editorial duration by trimming downstream, never submitting an
  // unsupported intermediate duration to the paid provider.
  if(model.modelId==="gen4_turbo"){
    return desiredSeconds<=5?5:10;
  }
  return Math.min(10,Math.max(2,desiredSeconds));
}

export class RunwayVideoAdapter implements MediaGenerationAdapter{
  readonly providerId="runway";

  constructor(
    private readonly apiSecret:string,
    private readonly baseUrl:string,
    private readonly apiVersion:string
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

  private headers(){
    return {
      authorization:"Bearer "+this.apiSecret,
      "content-type":"application/json",
      "x-runway-version":this.apiVersion
    };
  }

  async submit(input:{
    model:MediaModelDescriptor;
    request:CompiledGenerationRequest;
    references?:MediaGenerationReference[];
  }):Promise<MediaGenerationSubmission>{
    if(input.model.providerId!==this.providerId){
      throw new MediaProviderError(
        "The selected model does not belong to the Runway adapter.",
        true
      );
    }
    if(input.request.mediaKind!=="VIDEO"){
      throw new MediaProviderError(
        "The Runway video adapter only accepts VIDEO requests.",
        true
      );
    }
    const frame=firstFrame(input.references);
    const promptImage=frame?.dataUri??frame?.url;
    if(!promptImage){
      throw new MediaProviderError(
        "Runway image-to-video generation requires a resolved FIRST_FRAME reference.",
        true
      );
    }
    const ratio=RATIO_MAP[input.request.aspectRatio];
    if(!ratio){
      throw new MediaProviderError(
        "Runway does not support the requested aspect ratio: "+
          input.request.aspectRatio,
        true
      );
    }

    const body={
      model:input.model.modelId,
      promptImage,
      promptText:prompt(input.request),
      ratio,
      duration:durationSeconds(input.request,input.model)
    };

    let response:Response;
    try{
      response=await fetch(
        this.baseUrl.replace(/\/$/,"")+"/v1/image_to_video",
        {
          method:"POST",
          headers:this.headers(),
          body:JSON.stringify(body)
        }
      );
    }catch(error){
      throw new MediaProviderError(
        error instanceof Error
          ?"Runway generation request failed: "+error.message
          :"Runway generation request failed.",
        false
      );
    }
    if(!response.ok){
      const detail=(await response.text()).slice(0,2000);
      throw new MediaProviderError(
        "Runway image-to-video API returned HTTP "+response.status+
          (detail?": "+detail:""),
        permanentHttpStatus(response.status),
        response.status
      );
    }
    const payload=await response.json() as RunwayCreateTaskResponse;
    if(!payload.id){
      throw new MediaProviderError(
        "Runway image-to-video API returned no task ID.",
        true
      );
    }

    return {
      providerId:this.providerId,
      modelId:input.model.modelId,
      externalJobId:payload.id,
      requestSnapshot:body
    };
  }

  async poll(input:{
    model:MediaModelDescriptor;
    externalJobId:string;
  }):Promise<MediaGenerationResult>{
    let response:Response;
    try{
      response=await fetch(
        this.baseUrl.replace(/\/$/,"")+
          "/v1/tasks/"+encodeURIComponent(input.externalJobId),
        {
          method:"GET",
          headers:{
            authorization:"Bearer "+this.apiSecret,
            "x-runway-version":this.apiVersion
          }
        }
      );
    }catch(error){
      throw new MediaProviderError(
        error instanceof Error
          ?"Runway task polling failed: "+error.message
          :"Runway task polling failed.",
        false
      );
    }
    if(!response.ok){
      const detail=(await response.text()).slice(0,2000);
      throw new MediaProviderError(
        "Runway task API returned HTTP "+response.status+
          (detail?": "+detail:""),
        permanentHttpStatus(response.status),
        response.status
      );
    }

    const task=await response.json() as RunwayTaskResponse;
    const providerSnapshot={
      status:task.status??null,
      createdAt:task.createdAt??null,
      failure:task.failure??null,
      failureCode:task.failureCode??null
    };

    if(task.status==="SUCCEEDED"){
      return {
        externalJobId:input.externalJobId,
        status:"SUCCEEDED",
        outputs:(task.output??[]).map(url=>({
          kind:"REMOTE_URL" as const,
          contentType:"video/mp4",
          url
        })),
        providerSnapshot
      };
    }
    if(task.status==="FAILED"){
      return {
        externalJobId:input.externalJobId,
        status:"FAILED",
        outputs:[],
        errorMessage:task.failure??task.failureCode??"Runway task failed.",
        providerSnapshot
      };
    }
    if(task.status==="CANCELED"){
      return {
        externalJobId:input.externalJobId,
        status:"CANCELED",
        outputs:[],
        errorMessage:"Runway task was canceled.",
        providerSnapshot
      };
    }

    return {
      externalJobId:input.externalJobId,
      status:task.status==="PENDING"?"QUEUED":"RUNNING",
      outputs:[],
      providerSnapshot
    };
  }
}
