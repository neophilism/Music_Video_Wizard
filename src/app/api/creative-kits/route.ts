import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { parseCreativeKitForm } from "@/lib/creative-kits/input";
import {
  CreativeKitError,
  createCreativeKit,
  listCreativeKits
} from "@/lib/creative-kits/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const kits = await listCreativeKits({
    userId: session.user.id,
    displayName: session.user.name,
    query: url.searchParams.get("q") ?? undefined
  });

  return Response.json({ kits });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = parseCreativeKitForm(await request.formData());
    const created = await createCreativeKit({
      userId: session.user.id,
      displayName: session.user.name,
      ...parsed
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

    console.error("Creative Kit creation failed", error);
    return Response.json(
      { error: "Creative Kit creation failed." },
      { status: 500 }
    );
  }
}
