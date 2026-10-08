import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { lockFinishExportSchema } from "@/lib/finish-export/input";
import {
  FinishExportConflictError,
  FinishExportError,
  lockFinishExport
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
  console.error("Finish & Export lock failed",error);
  return Response.json(
    {error:"Finish & Export lock failed."},
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
    const body=lockFinishExportSchema.parse(await request.json());
    return Response.json(await lockFinishExport({
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision
    }));
  }catch(error){
    return handled(error);
  }
}
