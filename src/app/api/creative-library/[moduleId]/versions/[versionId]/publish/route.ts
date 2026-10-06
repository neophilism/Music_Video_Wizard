import { auth } from "@/lib/auth";
import {
  CreativeLibraryError,
  publishCreativeModuleVersion
} from "@/lib/creative-library/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ moduleId: string; versionId: string }>;
  }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { moduleId, versionId } = await context.params;
    const published = await publishCreativeModuleVersion({
      userId: session.user.id,
      displayName: session.user.name,
      moduleId,
      versionId
    });
    return Response.json(published);
  } catch (error) {
    if (error instanceof CreativeLibraryError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Creative Library publish failed", error);
    return Response.json(
      { error: "Creative Library publish failed." },
      { status: 500 }
    );
  }
}
