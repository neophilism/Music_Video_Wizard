import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { videoClipsGenerationSchema } from "@/lib/video-clips/input";
import {
  queueVideoClipsGeneration,
  VideoClipsConflictError,
  VideoClipsError
} from "@/lib/video-clips/service";
import { WizardError,WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof VideoClipsConflictError){
    return Response.json({error:error.message},{status:409});
  }
  if(
    error instanceof ZodError||
    error instanceof VideoClipsError||
    error instanceof WizardError||
    error instanceof WizardLockedError
  ){
    return Response.json({
      error:error instanceof ZodError
        ?error.issues.map(issue=>issue.message).join(" ")
        :error.message
    },{status:400});
  }
  console.error("Video Clips generation request failed",error);
  return Response.json(
    {error:"Video Clips generation request failed."},
    {status:500}
  );
}

export async function POST(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=videoClipsGenerationSchema.parse(await request.json());
    return Response.json(await queueVideoClipsGeneration({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision,
      shotSpecificationVersionIds:body.shotSpecificationVersionIds
    }),{status:202});
  }catch(error){
    return handled(error);
  }
}
