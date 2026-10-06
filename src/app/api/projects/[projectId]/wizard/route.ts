import { auth } from "@/lib/auth";
import {
  getWizardView,
  WizardError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

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
    const url = new URL(request.url);
    const view = await getWizardView({
      userId: session.user.id,
      projectId,
      selectedStepKey: url.searchParams.get("step") ?? undefined
    });
    return Response.json(view);
  } catch (error) {
    if (error instanceof WizardError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Wizard read failed", error);
    return Response.json({ error: "Wizard read failed." }, { status: 500 });
  }
}
