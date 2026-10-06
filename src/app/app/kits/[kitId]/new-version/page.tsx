import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CreativeKitForm } from "@/components/creative-kit-form";
import {
  getCreativeKit,
  listPublishedCreativeModuleVersions
} from "@/lib/creative-kits/service";

export default async function NewCreativeKitVersionPage(props: {
  params: Promise<{ kitId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { kitId } = await props.params;
  const [kit, versions] = await Promise.all([
    getCreativeKit({
      userId: session.user.id,
      displayName: session.user.name,
      kitId
    }),
    listPublishedCreativeModuleVersions({
      userId: session.user.id,
      displayName: session.user.name
    })
  ]);
  if (!kit) notFound();

  const latest = kit.versions[0];

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href={`/app/kits/${kit.id}`}>← {kit.name}</Link>
      </div>
      <p className="eyebrow">Creative Kit · new version</p>
      <h1 className="dashboardTitle">Refine the kit without changing history.</h1>
      <p className="dashboardNote">
        Existing projects retain the exact bindings they received. This creates
        another kit snapshot for future application.
      </p>
      <section className="dashboardCard projectFormCard">
        <CreativeKitForm
          mode="version"
          kitId={kit.id}
          endpoint={`/api/creative-kits/${kit.id}/versions`}
          availableVersions={versions.map((version) => ({
            id: version.id,
            moduleName: version.creativeModule.name,
            kind: version.creativeModule.kind,
            versionNumber: version.versionNumber
          }))}
          initialItems={latest?.items.map((item) => ({
            slot: item.slot,
            creativeModuleVersionId: item.creativeModuleVersionId
          }))}
          initialNotes={latest?.notes ?? ""}
        />
      </section>
    </main>
  );
}
