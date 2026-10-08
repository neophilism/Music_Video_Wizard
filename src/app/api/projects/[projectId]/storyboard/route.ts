import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { storyboardEditorActionSchema } from "@/lib/storyboard/input";
import {
  completeStoryboard,
  duplicateStoryboardShot,
  lockStoryboard,
  mergeStoryboardShots,
  reopenStoryboard,
  reorderStoryboardShots,
  rewriteStoryboardShot,
  splitStoryboardShot,
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
  console.error("Storyboard edit request failed",error);
  return Response.json({error:"Storyboard edit request failed."},{status:500});
}

export async function POST(
  request:Request,
  context:{params:Promise<{projectId:string}>}
){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=storyboardEditorActionSchema.parse(await request.json());
    const common={
      userId:session.user.id,
      projectId,
      expectedWizardRevision:body.expectedWizardRevision
    };
    if(body.action==="rewrite"){
      return Response.json(await rewriteStoryboardShot({
        ...common,
        shotVersionId:body.shotVersionId,
        fields:body.fields
      }));
    }
    if(body.action==="split"){
      return Response.json(await splitStoryboardShot({
        ...common,
        shotVersionId:body.shotVersionId,
        splitAtMs:body.splitAtMs
      }));
    }
    if(body.action==="duplicate"){
      return Response.json(await duplicateStoryboardShot({
        ...common,
        shotVersionId:body.shotVersionId
      }));
    }
    if(body.action==="merge"){
      return Response.json(await mergeStoryboardShots({
        ...common,
        firstShotVersionId:body.firstShotVersionId,
        secondShotVersionId:body.secondShotVersionId
      }));
    }
    if(body.action==="reorder"){
      return Response.json(await reorderStoryboardShots({
        ...common,
        sequenceVersionId:body.sequenceVersionId,
        orderedShotVersionIds:body.orderedShotVersionIds
      }));
    }
    if(body.action==="complete"){
      return Response.json(await completeStoryboard(common));
    }
    if(body.action==="reopen"){
      return Response.json(await reopenStoryboard(common));
    }
    return Response.json(await lockStoryboard(common));
  }catch(error){return handled(error);}
}
