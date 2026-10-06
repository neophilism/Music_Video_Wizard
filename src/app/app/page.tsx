import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePersonalWorkspace } from "@/lib/workspaces";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppHomePage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) redirect("/sign-in");

  const workspace = await ensurePersonalWorkspace(
    session.user.id,
    session.user.name
  );

  return (
    <main className="dashboardShell">
      <header className="dashboardHeader">
        <div>
          <p className="eyebrow">Music Video Wizard</p>
          <h1 className="dashboardTitle">Your studio</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="dashboardCard">
        <p className="dashboardLabel">Signed in as</p>
        <p className="dashboardValue">{session.user.email}</p>
        <p className="dashboardLabel">Workspace</p>
        <p className="dashboardValue">{workspace.name}</p>
        <p className="dashboardNote">
          Project creation arrives in PR 4. Authentication and workspace
          ownership are active now.
        </p>
      </section>
    </main>
  );
}
