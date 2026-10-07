import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { treatmentGenerationSchema } from "@/lib/treatment/input";
import {
  queueTreatmentGeneration,
  TreatmentConflictError,
  TreatmentError
} from "@/lib/treatment/service";
import { TextProviderError } from "@/lib/text-generation/types";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { projectId } = await context.params;
    const body = treatmentGenerationSchema.parse(await request.json());
    return Response.json(await queueTreatmentGeneration({
      userId: session.user.id,
      projectId,
      treatmentVersionId: body.treatmentVersionId,
      expectedRevision: body.expectedRevision,
      direction: body.direction
    }), { status: 202 });
  } catch (error) {
    if (error instanceof TreatmentConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof ZodError ||
      error instanceof TreatmentError ||
      error instanceof TextProviderError ||
      error instanceof WizardLockedError ||
      error instanceof WizardError
    ) {
      return Response.json({
        error: error instanceof ZodError
          ? error.issues.map((issue) => issue.message).join(" ")
          : error.message
      }, { status: 400 });
    }
    console.error("Treatment generation queue failed", error);
    return Response.json({ error: "Treatment generation could not be queued." }, { status: 500 });
  }
}
