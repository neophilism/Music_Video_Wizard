import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { musicMapGridPatchSchema } from "@/lib/music-map/input";
import {
  MusicMapConflictError,
  MusicMapError,
  updateMusicMapGrid
} from "@/lib/music-map/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const body = musicMapGridPatchSchema.parse(await request.json());
    return Response.json(
      await updateMusicMapGrid({
        userId: session.user.id,
        projectId,
        ...body
      })
    );
  } catch (error) {
    if (error instanceof MusicMapConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof ZodError ||
      error instanceof MusicMapError ||
      error instanceof WizardLockedError ||
      error instanceof WizardError
    ) {
      return Response.json(
        {
          error:
            error instanceof ZodError
              ? error.issues.map((issue) => issue.message).join(" ")
              : error.message
        },
        { status: 400 }
      );
    }
    console.error("Music Map grid update failed", error);
    return Response.json(
      { error: "Music Map grid update failed." },
      { status: 500 }
    );
  }
}
