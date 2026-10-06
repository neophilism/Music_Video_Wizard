import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { conceptSelectionSchema } from "@/lib/concepts/input";
import {
  ConceptConflictError,
  ConceptError,
  selectConcept
} from "@/lib/concepts/service";
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
    const body = conceptSelectionSchema.parse(await request.json());
    return Response.json(
      await selectConcept({
        userId: session.user.id,
        projectId,
        conceptSetVersionId: body.conceptSetVersionId,
        expectedRevision: body.expectedRevision,
        conceptId: body.conceptId
      })
    );
  } catch (error) {
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

    console.error("Concept selection failed", error);
    return Response.json(
      { error: "Concept selection failed." },
      { status: 500 }
    );
  }
}
