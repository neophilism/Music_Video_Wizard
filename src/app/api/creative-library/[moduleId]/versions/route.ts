import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { parseCreativeVersionForm } from "@/lib/creative-library/input";
import {
  CreativeLibraryError,
  createCreativeModuleVersion
} from "@/lib/creative-library/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { moduleId } = await context.params;
    const version = parseCreativeVersionForm(await request.formData());
    const created = await createCreativeModuleVersion({
      userId: session.user.id,
      displayName: session.user.name,
      moduleId,
      version
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof CreativeLibraryError) {
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

    console.error("Creative Library version creation failed", error);
    return Response.json(
      { error: "Creative Library version creation failed." },
      { status: 500 }
    );
  }
}
