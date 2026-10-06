import { MusicMapAnchorKind } from "@prisma/client";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { musicMapAnchorCreateSchema } from "@/lib/music-map/input";
import {
  createMusicMapAnchor,
  MusicMapConflictError,
  MusicMapError
} from "@/lib/music-map/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const body = musicMapAnchorCreateSchema.parse(await request.json());
    return Response.json(
      await createMusicMapAnchor({
        userId: session.user.id,
        projectId,
        ...body,
        kind: body.kind as MusicMapAnchorKind
      }),
      { status: 201 }
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
    console.error("Music Map anchor creation failed", error);
    return Response.json(
      { error: "Music Map anchor creation failed." },
      { status: 500 }
    );
  }
}
