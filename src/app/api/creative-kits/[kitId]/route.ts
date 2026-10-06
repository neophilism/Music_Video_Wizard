import { auth } from "@/lib/auth";
import { getCreativeKit } from "@/lib/creative-kits/service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ kitId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { kitId } = await context.params;
  const kit = await getCreativeKit({
    userId: session.user.id,
    displayName: session.user.name,
    kitId
  });

  if (!kit) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ kit });
}
