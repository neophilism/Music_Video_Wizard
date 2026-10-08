import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { storyboardShotRegenerationSchema } from "@/lib/storyboard/input";
import {
  queueStoryboardShotRegeneration,
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
  console.error("Storyboard shot regeneration failed",error);
  return Response.json(
    {error:"Storyboard shot regeneration failed."},
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
    const body=storyboardShotRegenerationSchema.parse(await request.json());
    return Response.json(await queueStoryboardShotRegeneration({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision,
      shotVersionId:body.shotVersionId,
      direction:body.direction
    }),{status:202});
  }catch(error){return handled(error);}
}
