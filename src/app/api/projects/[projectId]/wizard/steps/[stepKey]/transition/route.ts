import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { wizardTransitionSchema } from "@/lib/wizard/input";
import {
  transitionWizardStep,
  WizardConflictError,
  WizardError,
  WizardLockedError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; stepKey: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, stepKey } = await context.params;
    const body = wizardTransitionSchema.parse(await request.json());
    const result = await transitionWizardStep({
      userId: session.user.id,
      projectId,
      stepKey,
      expectedRevision: body.expectedRevision,
      action: body.action
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof WizardConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof ZodError ||
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
    console.error("Wizard transition failed", error);
    return Response.json(
      { error: "Wizard transition failed." },
      { status: 500 }
    );
  }
}
