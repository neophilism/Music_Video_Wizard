import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { parseCreativeKitVersionForm } from "@/lib/creative-kits/input";
import {
  CreativeKitError,
  createCreativeKitVersion
} from "@/lib/creative-kits/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ kitId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kitId } = await context.params;
    const version = parseCreativeKitVersionForm(await request.formData());
    const created = await createCreativeKitVersion({
      userId: session.user.id,
      displayName: session.user.name,
      kitId,
      version
    });
    return Response.json(created, { status: 201 });
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

    console.error("Creative Kit version creation failed", error);
    return Response.json(
      { error: "Creative Kit version creation failed." },
      { status: 500 }
    );
  }
}
