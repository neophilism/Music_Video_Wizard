import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { storyboardGenerationSchema } from "@/lib/storyboard/input";
import {
  queueStoryboardGeneration,
  StoryboardConflictError,
  StoryboardError
} from "@/lib/storyboard/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof StoryboardConflictError){
    return Response.json({error:error.message},{status:409});
  }
  if(
    error instanceof ZodError ||
    error instanceof StoryboardError ||
    error instanceof WizardError ||
    error instanceof WizardLockedError
  ){
    return Response.json({
      error:error instanceof ZodError
        ? error.issues.map(issue=>issue.message).join(" ")
        : error.message
    },{status:400});
  }
  console.error("Storyboard generation request failed",error);
  return Response.json(
    {error:"Storyboard generation request failed."},
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
    const body=storyboardGenerationSchema.parse(await request.json());
    return Response.json(await queueStoryboardGeneration({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision,
      direction:body.direction
    }),{status:202});
  }catch(error){return handled(error);}
}
