import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { sequenceMapActionSchema } from "@/lib/sequence-map/input";
import {
  completeSequenceMap,
  getSequenceMapState,
  initializeSequenceMap,
  lockSequenceMap,
  reopenSequenceMap,
  saveSequenceMap,
  SequenceMapConflictError,
  SequenceMapError
} from "@/lib/sequence-map/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof SequenceMapConflictError){
    return Response.json({error:error.message},{status:409});
  }
  if(
    error instanceof ZodError ||
    error instanceof SequenceMapError ||
    error instanceof WizardLockedError ||
    error instanceof WizardError
  ){
    return Response.json({
      error:error instanceof ZodError
        ? error.issues.map(issue=>issue.message).join(" ")
        : error.message
    },{status:400});
  }
  console.error("Sequence Map request failed",error);
  return Response.json({error:"Sequence Map request failed."},{status:500});
}

export async function GET(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    return Response.json(await getSequenceMapState({
      userId:session.user.id,
      projectId
    }));
  }catch(error){return handled(error);}
}

export async function POST(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=sequenceMapActionSchema.parse(await request.json());

    if(body.action==="initialize"){
      return Response.json(await initializeSequenceMap({
        userId:session.user.id,
        projectId
      }),{status:201});
    }

    const common={
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision
    };
    if(body.action==="save"){
      return Response.json(await saveSequenceMap({
        ...common,
        sequences:body.sequences
      }));
    }
    if(body.action==="complete"){
      return Response.json(await completeSequenceMap(common));
    }
    if(body.action==="reopen"){
      return Response.json(await reopenSequenceMap(common));
    }
    return Response.json(await lockSequenceMap(common));
  }catch(error){return handled(error);}
}
