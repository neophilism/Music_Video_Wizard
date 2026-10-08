import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { prepareRenderManifestSchema } from "@/lib/finish-export/input";
import {
  FinishExportConflictError,
  FinishExportError,
  getFinishExportState,
  prepareRenderManifest
} from "@/lib/finish-export/service";
import { WizardError,WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof FinishExportConflictError){
    return Response.json({error:error.message},{status:409});
  }
  if(
    error instanceof ZodError||
    error instanceof FinishExportError||
    error instanceof WizardError||
    error instanceof WizardLockedError
  ){
    return Response.json({
      error:error instanceof ZodError
        ?error.issues.map(issue=>issue.message).join(" ")
        :error.message
    },{status:400});
  }
  console.error("Finish & Export request failed",error);
  return Response.json(
    {error:"Finish & Export request failed."},
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
    return Response.json(await getFinishExportState({
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
    const body=prepareRenderManifestSchema.parse(await request.json());
    return Response.json(await prepareRenderManifest({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision
    }));
  }catch(error){
    return handled(error);
  }
}
