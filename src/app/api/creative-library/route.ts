import { CreativeModuleKind } from "@prisma/client";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import {
  CreativeLibraryError,
  createCreativeModule,
  listCreativeModules
} from "@/lib/creative-library/service";
import { parseCreativeModuleForm } from "@/lib/creative-library/input";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawKind = url.searchParams.get("kind");
  const kind =
    rawKind &&
    Object.values(CreativeModuleKind).includes(
      rawKind as CreativeModuleKind
    )
      ? (rawKind as CreativeModuleKind)
      : undefined;

  const modules = await listCreativeModules({
    userId: session.user.id,
    displayName: session.user.name,
    query: url.searchParams.get("q") ?? undefined,
    kind
  });

  return Response.json({ modules });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const parsed = parseCreativeModuleForm(form);
    const created = await createCreativeModule({
      userId: session.user.id,
      displayName: session.user.name,
      ...parsed
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

    console.error("Creative Library creation failed", error);
    return Response.json(
      { error: "Creative Library creation failed." },
      { status: 500 }
    );
  }
}
