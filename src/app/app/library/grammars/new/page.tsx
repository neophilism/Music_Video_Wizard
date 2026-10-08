import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreativeGrammarForm } from "@/components/creative-grammar-form";

export default async function NewCreativeGrammarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/library">← Creative Library</Link>
      </div>
      <p className="eyebrow">Creative Grammar Builder</p>
      <h1 className="dashboardTitle">Define how the video behaves.</h1>
      <p className="dashboardNote">
        Build reusable cinematography, composition, motion, performance,
        editing and transition rule systems with explicit triggers, strengths
        and category-specific controls.
      </p>
      <CreativeGrammarForm mode="create" endpoint="/api/creative-library" />
    </main>
  );
}
