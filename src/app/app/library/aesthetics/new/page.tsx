import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VisualAestheticForm } from "@/components/visual-aesthetic-form";

export default async function NewVisualAestheticPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/library">← Creative Library</Link>
      </div>
      <p className="eyebrow">Visual Aesthetic Builder</p>
      <h1 className="dashboardTitle">Build a reusable visual language.</h1>
      <p className="dashboardNote">
        Define the image character explicitly: medium, realism, texture, palette,
        tonal behavior, lighting, grain, lens artifacts, surfaces, references
        and provider-specific interpretation hints.
      </p>
      <VisualAestheticForm mode="create" endpoint="/api/creative-library" />
    </main>
  );
}
