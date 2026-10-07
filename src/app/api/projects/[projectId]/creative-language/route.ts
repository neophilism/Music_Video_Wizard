import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { creativeLanguageActionSchema } from "@/lib/creative-language/input";
import {
  completeCreativeLanguage,
  CreativeLanguageConflictError,
  CreativeLanguageError,
  getCreativeLanguageState,
  initializeCreativeLanguage,
  lockCreativeLanguage,
  reopenCreativeLanguage,
  saveCreativeLanguage
} from "@/lib/creative-language/service";
import {
  WizardError,
  WizardLockedError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

function handled(error: unknown) {
  if (error instanceof CreativeLanguageConflictError) {
    return Response.json(
      { error: error.message },
      { status: 409 }
    );
  }
  if (
    error instanceof ZodError ||
    error instanceof CreativeLanguageError ||
    error instanceof WizardLockedError ||
    error instanceof WizardError
  ) {
    return Response.json(
      {
        error:
          error instanceof ZodError
            ? error.issues
                .map((issue) => issue.message)
                .join(" ")
            : error.message
      },
      { status: 400 }
    );
  }
  console.error("Creative Language request failed", error);
  return Response.json(
    { error: "Creative Language request failed." },
    { status: 500 }
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers
  });
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { projectId } = await context.params;
    return Response.json(
      await getCreativeLanguageState({
        userId: session.user.id,
        projectId
      })
    );
  } catch (error) {
    return handled(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({
    headers: request.headers
  });
  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { projectId } = await context.params;
    const body = creativeLanguageActionSchema.parse(
      await request.json()
    );

    if (body.action === "initialize") {
      return Response.json(
        await initializeCreativeLanguage({
          userId: session.user.id,
          projectId
        }),
        { status: 201 }
      );
    }

    const common = {
      userId: session.user.id,
      projectId,
      creativeLanguageVersionId:
        body.creativeLanguageVersionId,
      expectedRevision: body.expectedRevision
    };

    if (body.action === "save") {
      return Response.json(
        await saveCreativeLanguage({
          ...common,
          document: body.document
        })
      );
    }
    if (body.action === "complete") {
      return Response.json(
        await completeCreativeLanguage(common)
      );
    }
    if (body.action === "reopen") {
      return Response.json(
        await reopenCreativeLanguage(common)
      );
    }
    return Response.json(
      await lockCreativeLanguage(common)
    );
  } catch (error) {
    return handled(error);
  }
}
