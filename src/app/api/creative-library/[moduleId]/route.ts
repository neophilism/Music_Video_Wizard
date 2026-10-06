import { auth } from "@/lib/auth";
import { getCreativeModule } from "@/lib/creative-library/service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId } = await context.params;
  const module = await getCreativeModule({
    userId: session.user.id,
    displayName: session.user.name,
    moduleId
  });

  if (!module) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ module });
}
