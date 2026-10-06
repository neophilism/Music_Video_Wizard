import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCreativeModule } from "@/lib/creative-library/service";
import { PublishCreativeVersionButton } from "@/components/publish-creative-version-button";

export default async function CreativeModulePage(props: {
  params: Promise<{ moduleId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { moduleId } = await props.params;
  const module = await getCreativeModule({
    userId: session.user.id,
    displayName: session.user.name,
    moduleId
  });
  if (!module) notFound();

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app/library">← Creative Library</Link>
      </div>

      <header className="dashboardHeader">
        <div>
          <p className="eyebrow">
            {module.kind.replaceAll("_", " ")}
          </p>
          <h1 className="dashboardTitle">{module.name}</h1>
          <p className="dashboardNote">
            {module.description || "No description"}
          </p>
          <div className="tagRow">
            {module.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        </div>
        <Link
          className="primaryButton linkButton"
          href={"/app/library/" + module.id + "/new-version"}
        >
          New version
        </Link>
      </header>

      <section className="versionStack">
        {module.versions.map((version) => (
          <article className="dashboardCard versionCard" key={version.id}>
            <div className="versionHeader">
              <div>
                <h2>Version {version.versionNumber}</h2>
                <p>
                  {version.lifecycle} · node {version.nodeId.slice(0, 8)}…
                </p>
              </div>
              {version.lifecycle === "DRAFT" ? (
                <PublishCreativeVersionButton
                  moduleId={module.id}
                  versionId={version.id}
                />
              ) : null}
            </div>

            <div className="versionField">
              <strong>Structured definition</strong>
              <pre>{JSON.stringify(version.definition, null, 2)}</pre>
            </div>

            {version.positivePrompt ? (
              <div className="versionField">
                <strong>Positive prompt module</strong>
                <p>{version.positivePrompt}</p>
              </div>
            ) : null}

            {version.negativePrompt ? (
              <div className="versionField">
                <strong>Negative prompt / exclusions</strong>
                <p>{version.negativePrompt}</p>
              </div>
            ) : null}

            {version.references.length ? (
              <div className="versionField">
                <strong>Exact references</strong>
                <ul>
                  {version.references.map((reference) => (
                    <li key={reference.id}>
                      {reference.assetVersion.asset.name ?? reference.assetVersion.asset.kind}
                      {" — v"}
                      {reference.assetVersion.versionNumber}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {version.notes ? (
              <div className="versionField">
                <strong>Notes</strong>
                <p>{version.notes}</p>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
