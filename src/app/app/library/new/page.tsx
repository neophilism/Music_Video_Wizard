import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreativeModuleForm } from "@/components/creative-module-form";

export default async function NewCreativeModulePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/library">← Creative Library</Link>
      </div>
      <p className="eyebrow">Creative Library</p>
      <h1 className="dashboardTitle">Save a reusable decision.</h1>
      <p className="dashboardNote">
        Store the structured decision itself, prompt fragments, exclusions and
        exact reference assets separately from any generation provider.
      </p>
      <section className="dashboardCard projectFormCard">
        <CreativeModuleForm
          mode="create"
          endpoint="/api/creative-library"
        />
      </section>
    </main>
  );
}
