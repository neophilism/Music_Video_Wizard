import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { songPicturePlanGenerationSchema } from "@/lib/song-picture-plan/input";
import {
  queueSongPicturePlanGeneration,
  SongPicturePlanConflictError,
  SongPicturePlanError
} from "@/lib/song-picture-plan/service";
import { TextProviderError } from "@/lib/text-generation/types";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

export async function POST(request:Request,context:{params:Promise<{projectId:string}>}){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=songPicturePlanGenerationSchema.parse(await request.json());
    return Response.json(await queueSongPicturePlanGeneration({
      userId:session.user.id,
      projectId,
      songPicturePlanVersionId:body.songPicturePlanVersionId,
      expectedRevision:body.expectedRevision,
      direction:body.direction
    }),{status:202});
  }catch(error){
    if(error instanceof SongPicturePlanConflictError) return Response.json({error:error.message},{status:409});
    if(error instanceof ZodError||error instanceof SongPicturePlanError||error instanceof TextProviderError||error instanceof WizardLockedError||error instanceof WizardError){
      return Response.json({error:error instanceof ZodError?error.issues.map(i=>i.message).join(" "):error.message},{status:400});
    }
    console.error("Song-to-Picture generation queue failed",error);
    return Response.json({error:"Song-to-Picture generation could not be queued."},{status:500});
  }
}
