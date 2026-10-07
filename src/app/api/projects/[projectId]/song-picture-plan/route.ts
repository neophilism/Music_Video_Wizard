import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { songPicturePlanActionSchema } from "@/lib/song-picture-plan/input";
import {
  completeSongPicturePlan,
  getSongPicturePlanState,
  initializeSongPicturePlan,
  lockSongPicturePlan,
  reopenSongPicturePlan,
  saveSongPicturePlan,
  SongPicturePlanConflictError,
  SongPicturePlanError
} from "@/lib/song-picture-plan/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime="nodejs";

function handled(error:unknown){
  if(error instanceof SongPicturePlanConflictError) return Response.json({error:error.message},{status:409});
  if(error instanceof ZodError||error instanceof SongPicturePlanError||error instanceof WizardLockedError||error instanceof WizardError){
    return Response.json({error:error instanceof ZodError?error.issues.map(i=>i.message).join(" "):error.message},{status:400});
  }
  console.error("Song-to-Picture request failed",error);
  return Response.json({error:"Song-to-Picture request failed."},{status:500});
}

export async function GET(request:Request,context:{params:Promise<{projectId:string}>}){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    return Response.json(await getSongPicturePlanState({userId:session.user.id,projectId}));
  }catch(error){return handled(error);}
}

export async function POST(request:Request,context:{params:Promise<{projectId:string}>}){
  const session=await auth.api.getSession({headers:request.headers});
  if(!session) return Response.json({error:"Unauthorized"},{status:401});
  try{
    const {projectId}=await context.params;
    const body=songPicturePlanActionSchema.parse(await request.json());
    if(body.action==="initialize"){
      return Response.json(await initializeSongPicturePlan({userId:session.user.id,projectId}),{status:201});
    }
    const common={userId:session.user.id,projectId,songPicturePlanVersionId:body.songPicturePlanVersionId,expectedRevision:body.expectedRevision};
    if(body.action==="save") return Response.json(await saveSongPicturePlan({...common,document:body.document}));
    if(body.action==="complete") return Response.json(await completeSongPicturePlan(common));
    if(body.action==="reopen") return Response.json(await reopenSongPicturePlan(common));
    return Response.json(await lockSongPicturePlan(common));
  }catch(error){return handled(error);}
}
