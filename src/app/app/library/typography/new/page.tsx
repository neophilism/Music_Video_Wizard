import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TypographyKitForm } from "@/components/typography-kit-form";

export default async function NewTypographyKitPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session) redirect("/sign-in");
  return <main className="dashboardShell">
    <div className="pageBack"><Link href="/app/library">← Creative Library</Link></div>
    <p className="eyebrow">Typography System Builder</p>
    <h1 className="dashboardTitle">Make on-screen type part of the direction.</h1>
    <p className="dashboardNote">Define role hierarchy, type-family guidance, case, spacing, placement, motion, timing, compositing and accessibility as one reusable system.</p>
    <TypographyKitForm mode="create" endpoint="/api/creative-library"/>
  </main>;
}
