import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { parseProjectCreationForm } from "@/lib/projects/project-input";
import { createProjectWithAudio } from "@/lib/projects/create-project";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const project = parseProjectCreationForm(form);
    const audio = form.get("audio");

    if (!(audio instanceof File)) {
      return Response.json(
        { error: "A finished audio master is required." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await audio.arrayBuffer());
    const created = await createProjectWithAudio({
      userId: session.user.id,
      displayName: session.user.name,
      project,
      audio: {
        originalFileName: audio.name,
        bytes
      }
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "Invalid project settings.",
          issues: error.issues.map((issue) => issue.message)
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && /audio file|Unsupported audio/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Project creation failed", error);
    return Response.json(
      { error: "Project creation failed." },
      { status: 500 }
    );
  }
}
