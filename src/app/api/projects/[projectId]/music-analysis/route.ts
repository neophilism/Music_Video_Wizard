import { z, ZodError } from "zod";
import { auth } from "@/lib/auth";
import {
  getMusicAnalysisState,
  MusicAnalysisError,
  queueMusicAnalysis
} from "@/lib/music-analysis/service";
import {
  WizardError,
  WizardLockedError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

const startSchema = z.object({
  includeLyrics: z.boolean().default(false)
});

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const state = await getMusicAnalysisState({
      userId: session.user.id,
      projectId
    });
    return Response.json(state);
  } catch (error) {
    if (error instanceof MusicAnalysisError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error("Music analysis state read failed", error);
    return Response.json(
      { error: "Music analysis state read failed." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = startSchema.parse(await request.json());
    const queued = await queueMusicAnalysis({
      userId: session.user.id,
      projectId,
      includeLyrics: body.includeLyrics
    });
    return Response.json(queued, { status: queued.reused ? 200 : 202 });
  } catch (error) {
    if (
      error instanceof ZodError ||
      error instanceof MusicAnalysisError ||
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
    console.error("Music analysis enqueue failed", error);
    return Response.json(
      { error: "Music analysis could not be queued." },
      { status: 500 }
    );
  }
}
