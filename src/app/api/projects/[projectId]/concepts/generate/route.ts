import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { conceptGenerationRequestSchema } from "@/lib/concepts/input";
import {
  ConceptConflictError,
  ConceptError,
  queueConceptGeneration
} from "@/lib/concepts/service";
import { TextProviderError } from "@/lib/text-generation/types";
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
    const body = conceptGenerationRequestSchema.parse(
      await request.json()
    );

    return Response.json(
      await queueConceptGeneration({
        userId: session.user.id,
        projectId,
        conceptSetVersionId: body.conceptSetVersionId,
        expectedRevision: body.expectedRevision,
        operation: body.operation,
        count: body.operation === "generate" ? body.count : 1,
        direction:
          body.operation === "generate"
            ? body.direction
            : body.instruction,
        parentConceptIds:
          body.operation === "revise"
            ? [body.parentConceptId]
            : body.operation === "combine"
              ? body.parentConceptIds
              : []
      }),
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ConceptConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof ZodError ||
      error instanceof ConceptError ||
      error instanceof TextProviderError ||
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

    console.error("Concept generation queue failed", error);
    return Response.json(
      { error: "Concept generation could not be queued." },
      { status: 500 }
    );
  }
}
