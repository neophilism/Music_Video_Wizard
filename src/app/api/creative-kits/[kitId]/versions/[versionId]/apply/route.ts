import { z, ZodError } from "zod";
import { auth } from "@/lib/auth";
import {
  applyCreativeKitVersion,
  CreativeKitError
} from "@/lib/creative-kits/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  scopeNodeId: z.string().uuid(),
  mode: z.enum(["overwrite", "fill-empty"]).default("overwrite")
});

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
    const body = bodySchema.parse(await request.json());
    const result = await applyCreativeKitVersion({
      userId: session.user.id,
      displayName: session.user.name,
      kitId,
      versionId,
      scopeNodeId: body.scopeNodeId,
      mode: body.mode
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof CreativeKitError) {
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

    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Creative Kit application failed." },
      { status: 500 }
    );
  }
}
