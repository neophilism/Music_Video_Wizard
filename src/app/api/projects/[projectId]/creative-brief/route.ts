import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import {
  creativeBriefActionSchema,
  creativeBriefSaveSchema
} from "@/lib/creative-brief/input";
import {
  completeCreativeBrief,
  CreativeBriefConflictError,
  CreativeBriefError,
  getCreativeBriefState,
  initializeCreativeBrief,
  lockCreativeBrief,
  reopenCreativeBrief,
  saveCreativeBrief
} from "@/lib/creative-brief/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof CreativeBriefConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (
    error instanceof ZodError ||
    error instanceof CreativeBriefError ||
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

  console.error("Creative Brief request failed", error);
  return Response.json(
    { error: "Creative Brief request failed." },
    { status: 500 }
  );
}

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
    return Response.json(
      await getCreativeBriefState({
        userId: session.user.id,
        projectId
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = creativeBriefSaveSchema.parse(await request.json());
    return Response.json(
      await saveCreativeBrief({
        userId: session.user.id,
        projectId,
        ...body
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
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await context.params;
    const body = creativeBriefActionSchema.parse(await request.json());

    if (body.action === "initialize") {
      return Response.json(
        await initializeCreativeBrief({
          userId: session.user.id,
          projectId
        }),
        { status: 201 }
      );
    }

    const common = {
      userId: session.user.id,
      projectId,
      briefVersionId: body.briefVersionId,
      expectedRevision: body.expectedRevision
    };

    if (body.action === "complete") {
      return Response.json(await completeCreativeBrief(common));
    }
    if (body.action === "reopen") {
      return Response.json(await reopenCreativeBrief(common));
    }
    return Response.json(await lockCreativeBrief(common));
  } catch (error) {
    return errorResponse(error);
  }
}
