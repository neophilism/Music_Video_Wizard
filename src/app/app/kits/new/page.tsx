import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreativeKitForm } from "@/components/creative-kit-form";
import { listPublishedCreativeModuleVersions } from "@/lib/creative-kits/service";

export default async function NewCreativeKitPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const versions = await listPublishedCreativeModuleVersions({
    userId: session.user.id,
    displayName: session.user.name
  });

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/kits">← Creative Kits</Link>
      </div>
      <p className="eyebrow">Creative Kits</p>
      <h1 className="dashboardTitle">Assemble a reusable creative system.</h1>
      <p className="dashboardNote">
        Only published Library versions can enter a kit. That guarantees the
        kit always points to immutable exact decisions.
      </p>
      <section className="dashboardCard projectFormCard">
        <CreativeKitForm
          mode="create"
          endpoint="/api/creative-kits"
          availableVersions={versions.map((version) => ({
            id: version.id,
            moduleName: version.creativeModule.name,
            kind: version.creativeModule.kind,
            versionNumber: version.versionNumber
          }))}
        />
      </section>
    </main>
  );
}
