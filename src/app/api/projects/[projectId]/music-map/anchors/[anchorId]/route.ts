import { MusicMapAnchorDecision } from "@prisma/client";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import {
  musicMapAnchorDeleteSchema,
  musicMapAnchorPatchSchema
} from "@/lib/music-map/input";
import {
  deleteMusicMapAnchor,
  MusicMapConflictError,
  MusicMapError,
  updateMusicMapAnchor
} from "@/lib/music-map/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

function handled(error: unknown) {
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
  console.error("Music Map anchor mutation failed", error);
  return Response.json(
    { error: "Music Map anchor mutation failed." },
    { status: 500 }
  );
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ projectId: string; anchorId: string }>;
  }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId, anchorId } = await context.params;
    const body = musicMapAnchorPatchSchema.parse(await request.json());
    return Response.json(
      await updateMusicMapAnchor({
        userId: session.user.id,
        projectId,
        anchorId,
        ...body,
        decision: body.decision
          ? (body.decision as MusicMapAnchorDecision)
          : undefined
      })
    );
  } catch (error) {
    return handled(error);
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ projectId: string; anchorId: string }>;
  }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId, anchorId } = await context.params;
    const body = musicMapAnchorDeleteSchema.parse(await request.json());
    return Response.json(
      await deleteMusicMapAnchor({
        userId: session.user.id,
        projectId,
        anchorId,
        ...body
      })
    );
  } catch (error) {
    return handled(error);
  }
}
