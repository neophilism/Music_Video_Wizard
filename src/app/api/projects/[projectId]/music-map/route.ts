import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { musicMapActionSchema } from "@/lib/music-map/input";
import {
  completeMusicMap,
  getMusicMapState,
  initializeMusicMap,
  lockMusicMap,
  MusicMapConflictError,
  MusicMapError
} from "@/lib/music-map/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
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
  console.error("Music Map request failed", error);
  return Response.json({ error: "Music Map request failed." }, { status: 500 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId } = await context.params;
    return Response.json(
      await getMusicMapState({
        userId: session.user.id,
        projectId
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { projectId } = await context.params;
    const body = musicMapActionSchema.parse(await request.json());

    if (body.action === "initialize") {
      return Response.json(
        await initializeMusicMap({
          userId: session.user.id,
          projectId
        }),
        { status: 201 }
      );
    }

    if (body.action === "complete") {
      return Response.json(
        await completeMusicMap({
          userId: session.user.id,
          projectId,
          mapVersionId: body.mapVersionId,
          expectedRevision: body.expectedRevision
        })
      );
    }

    return Response.json(
      await lockMusicMap({
        userId: session.user.id,
        projectId,
        mapVersionId: body.mapVersionId,
        expectedRevision: body.expectedRevision
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}
