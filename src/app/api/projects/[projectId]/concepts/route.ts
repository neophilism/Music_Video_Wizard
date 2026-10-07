import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { conceptSetActionSchema } from "@/lib/concepts/input";
import {
  completeConcepts,
  ConceptConflictError,
  ConceptError,
  getConceptState,
  initializeConceptSet,
  lockConcepts,
  reopenConcepts
} from "@/lib/concepts/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

function handled(error: unknown) {
  if (error instanceof ConceptConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (
    error instanceof ZodError ||
    error instanceof ConceptError ||
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

  console.error("Concepts request failed", error);
  return Response.json(
    { error: "Concepts request failed." },
    { status: 500 }
  );
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
      await getConceptState({
        userId: session.user.id,
        projectId
      })
    );
  } catch (error) {
    return handled(error);
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
    const body = conceptSetActionSchema.parse(await request.json());

    if (body.action === "initialize") {
      return Response.json(
        await initializeConceptSet({
          userId: session.user.id,
          projectId
        }),
        { status: 201 }
      );
    }

    const common = {
      userId: session.user.id,
      projectId,
      conceptSetVersionId: body.conceptSetVersionId,
      expectedRevision: body.expectedRevision
    };

    if (body.action === "complete") {
      return Response.json(await completeConcepts(common));
    }
    if (body.action === "reopen") {
      return Response.json(await reopenConcepts(common));
    }
    return Response.json(await lockConcepts(common));
  } catch (error) {
    return handled(error);
  }
}
