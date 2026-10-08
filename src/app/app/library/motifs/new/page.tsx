import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MotifForm } from "@/components/motif-form";

export default async function NewMotifPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session) redirect("/sign-in");
  return <main className="dashboardShell">
    <div className="pageBack"><Link href="/app/library">← Creative Library</Link></div>
    <p className="eyebrow">Motif Builder</p>
    <h1 className="dashboardTitle">Design recurrence with meaning.</h1>
    <p className="dashboardNote">Define a motif’s visual signature, semantic purpose, recurrence cues, evolution, permitted variation and prohibited uses.</p>
    <MotifForm mode="create" endpoint="/api/creative-library"/>
  </main>;
}
