import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listCreativeKits } from "@/lib/creative-kits/service";

export default async function CreativeKitsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const searchParams = await props.searchParams;
  const kits = await listCreativeKits({
    userId: session.user.id,
    displayName: session.user.name,
    query: searchParams.q
  });

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app">← Studio</Link>
      </div>
      <header className="dashboardHeader">
        <div>
          <p className="eyebrow">Creative Kits</p>
          <h1 className="dashboardTitle">Reuse a complete creative system.</h1>
          <p className="dashboardNote">
            Kits group exact published Library versions into named inheritance
            slots. Applying a kit is a deliberate snapshot, not a live link.
          </p>
        </div>
        <div className="headerActions">
          <Link className="secondaryButton linkButton" href="/app/library">
            Creative Library
          </Link>
          <Link className="primaryButton linkButton" href="/app/kits/new">
            New Creative Kit
          </Link>
        </div>
      </header>

      <form className="libraryFilters kitSearch" method="get">
        <input
          aria-label="Search Creative Kits"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search name, description or exact tag"
        />
        <button className="secondaryButton" type="submit">
          Search
        </button>
      </form>

      {kits.length === 0 ? (
        <section className="emptyState">
          <h3>No matching Creative Kits.</h3>
          <p>
            Publish Library versions first, then assemble them into a reusable
            creative system such as a performance look, narrative world, or
            camera-and-editing grammar.
          </p>
        </section>
      ) : (
        <section className="libraryGrid">
          {kits.map((kit) => {
            const latest = kit.versions[0];
            return (
              <Link
                className="libraryCard"
                href={`/app/kits/${kit.id}`}
                key={kit.id}
              >
                <div className="libraryCardTop">
                  <span>Creative Kit</span>
                  <span>
                    {latest?._count.items ?? 0} slot
                    {(latest?._count.items ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <h2>{kit.name}</h2>
                <p>{kit.description || "No description"}</p>
                <div className="tagRow">
                  {kit.tags.slice(0, 6).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <div className="libraryVersionMeta">
                  Latest v{latest?.versionNumber ?? "—"} ·{" "}
                  {latest?.lifecycle ?? "—"} · {kit._count.versions} version
                  {kit._count.versions === 1 ? "" : "s"}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
