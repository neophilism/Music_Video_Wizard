import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { creativeLanguageGenerationSchema } from "@/lib/creative-language/input";
import {
  CreativeLanguageConflictError,
  CreativeLanguageError,
  queueCreativeLanguageGeneration
} from "@/lib/creative-language/service";
import { TextProviderError } from "@/lib/text-generation/types";
import {
  WizardError,
  WizardLockedError
} from "@/lib/wizard/service";

export const runtime = "nodejs";

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
    const body = creativeLanguageGenerationSchema.parse(
      await request.json()
    );
    return Response.json(
      await queueCreativeLanguageGeneration({
        userId: session.user.id,
        projectId,
        creativeLanguageVersionId:
          body.creativeLanguageVersionId,
        expectedRevision: body.expectedRevision,
        direction: body.direction
      }),
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof CreativeLanguageConflictError) {
      return Response.json(
        { error: error.message },
        { status: 409 }
      );
    }
    if (
      error instanceof ZodError ||
      error instanceof CreativeLanguageError ||
      error instanceof TextProviderError ||
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

    console.error(
      "Creative Language generation queue failed",
      error
    );
    return Response.json(
      {
        error:
          "Creative Language generation could not be queued."
      },
      { status: 500 }
    );
  }
}
