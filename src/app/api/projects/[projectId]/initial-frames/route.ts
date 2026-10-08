import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { initialFramesActionSchema } from "@/lib/initial-frames/input";
import {
  getInitialFramesState,
  InitialFramesConflictError,
  InitialFramesError,
  lockInitialFrames
} from "@/lib/initial-frames/service";
import { WizardError,WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof InitialFramesConflictError){
    return Response.json({error:error.message},{status:409});
  }
  if(
    error instanceof ZodError||
    error instanceof InitialFramesError||
    error instanceof WizardError||
    error instanceof WizardLockedError
  ){
    return Response.json({
      error:error instanceof ZodError
        ?error.issues.map(issue=>issue.message).join(" ")
        :error.message
    },{status:400});
  }
  console.error("Initial Frames request failed",error);
  return Response.json(
    {error:"Initial Frames request failed."},
    {status:500}
  );
}

export async function GET(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    return Response.json(await getInitialFramesState({
      userId:session.user.id,
      projectId
    }));
  }catch(error){
    return handled(error);
  }
}

export async function POST(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=initialFramesActionSchema.parse(await request.json());
    return Response.json(await lockInitialFrames({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision
    }));
  }catch(error){
    return handled(error);
  }
}
