import { auth } from "@/lib/auth";
import {
  CreativeKitError,
  publishCreativeKitVersion
} from "@/lib/creative-kits/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ kitId: string; versionId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kitId, versionId } = await context.params;
    const result = await publishCreativeKitVersion({
      userId: session.user.id,
      displayName: session.user.name,
      kitId,
      versionId
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof CreativeKitError || error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Creative Kit publish failed." },
      { status: 500 }
    );
  }
}
