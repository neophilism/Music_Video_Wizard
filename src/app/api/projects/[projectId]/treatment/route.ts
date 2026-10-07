import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { treatmentActionSchema } from "@/lib/treatment/input";
import {
  completeTreatment,
  getTreatmentState,
  initializeTreatment,
  lockTreatment,
  reopenTreatment,
  saveTreatment,
  TreatmentConflictError,
  TreatmentError
} from "@/lib/treatment/service";
import { WizardError, WizardLockedError } from "@/lib/wizard/service";

export const runtime = "nodejs";

function handled(error: unknown) {
  if (error instanceof TreatmentConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  if (
    error instanceof ZodError ||
    error instanceof TreatmentError ||
    error instanceof WizardLockedError ||
    error instanceof WizardError
  ) {
    return Response.json({
      error: error instanceof ZodError
        ? error.issues.map((issue) => issue.message).join(" ")
        : error.message
    }, { status: 400 });
  }
  console.error("Treatment request failed", error);
  return Response.json({ error: "Treatment request failed." }, { status: 500 });
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { projectId } = await context.params;
    return Response.json(await getTreatmentState({ userId: session.user.id, projectId }));
  } catch (error) {
    return handled(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { projectId } = await context.params;
    const body = treatmentActionSchema.parse(await request.json());
    if (body.action === "initialize") {
      return Response.json(await initializeTreatment({ userId: session.user.id, projectId }), { status: 201 });
    }
    const common = {
      userId: session.user.id,
      projectId,
      treatmentVersionId: body.treatmentVersionId,
      expectedRevision: body.expectedRevision
    };
    if (body.action === "save") {
      return Response.json(await saveTreatment({ ...common, treatment: body.treatment }));
    }
    if (body.action === "complete") return Response.json(await completeTreatment(common));
    if (body.action === "reopen") return Response.json(await reopenTreatment(common));
    return Response.json(await lockTreatment(common));
  } catch (error) {
    return handled(error);
  }
}
