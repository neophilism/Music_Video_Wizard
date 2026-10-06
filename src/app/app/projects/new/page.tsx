import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewProjectForm } from "@/components/new-project-form";

export default async function NewProjectPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) redirect("/sign-in");

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app">← Studio</Link>
      </div>
      <p className="eyebrow">New project</p>
      <h1 className="dashboardTitle">Start with the finished song.</h1>
      <p className="dashboardNote">
        These settings establish the project’s immutable audio master and
        initial output target. Creative direction comes next.
      </p>
      <section className="dashboardCard projectFormCard">
        <NewProjectForm />
      </section>
    </main>
  );
}
