import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PublishCreativeKitButton } from "@/components/publish-creative-kit-button";
import { getCreativeKit } from "@/lib/creative-kits/service";

export default async function CreativeKitPage(props: {
  params: Promise<{ kitId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { kitId } = await props.params;
  const kit = await getCreativeKit({
    userId: session.user.id,
    displayName: session.user.name,
    kitId
  });
  if (!kit) notFound();

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/kits">← Creative Kits</Link>
      </div>

      <header className="dashboardHeader">
        <div>
          <p className="eyebrow">Creative Kit</p>
          <h1 className="dashboardTitle">{kit.name}</h1>
          <p className="dashboardNote">
            {kit.description || "No description"}
          </p>
          <div className="tagRow">
            {kit.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        </div>
        <Link
          className="primaryButton linkButton"
          href={`/app/kits/${kit.id}/new-version`}
        >
          New version
        </Link>
      </header>

      <section className="versionStack">
        {kit.versions.map((version) => (
          <article className="dashboardCard versionCard" key={version.id}>
            <div className="versionHeader">
              <div>
                <h2>Version {version.versionNumber}</h2>
                <p>
                  {version.lifecycle} · {version.items.length} slot
                  {version.items.length === 1 ? "" : "s"} · node{" "}
                  {version.nodeId.slice(0, 8)}…
                </p>
              </div>
              {version.lifecycle === "DRAFT" ? (
                <PublishCreativeKitButton
                  kitId={kit.id}
                  versionId={version.id}
                />
              ) : null}
            </div>

            <div className="kitVersionItems">
              {version.items.map((item) => (
                <div className="kitVersionItem" key={item.id}>
                  <div>
                    <strong>{item.slot}</strong>
                    <p>
                      {item.creativeModuleVersion.creativeModule.name} · v
                      {item.creativeModuleVersion.versionNumber}
                    </p>
                  </div>
                  <span>
                    {item.creativeModuleVersion.creativeModule.kind
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            {version.notes ? (
              <div className="versionField">
                <strong>Version notes</strong>
                <p>{version.notes}</p>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
