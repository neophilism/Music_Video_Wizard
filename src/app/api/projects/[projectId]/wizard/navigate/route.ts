import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { wizardNavigateSchema } from "@/lib/wizard/input";
import {
  navigateWizard,
  WizardError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

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
    const body = wizardNavigateSchema.parse(await request.json());
    const result = await navigateWizard({
      userId: session.user.id,
      projectId,
      stepKey: body.stepKey
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof WizardError) {
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
    console.error("Wizard navigation failed", error);
    return Response.json(
      { error: "Wizard navigation failed." },
      { status: 500 }
    );
  }
}
