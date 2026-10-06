import Link from "next/link";
import { CreativeModuleKind } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listCreativeModules } from "@/lib/creative-library/service";

export default async function CreativeLibraryPage(props: {
  searchParams: Promise<{ q?: string; kind?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const searchParams = await props.searchParams;
  const kind = Object.values(CreativeModuleKind).includes(
    searchParams.kind as CreativeModuleKind
  )
    ? (searchParams.kind as CreativeModuleKind)
    : undefined;

  const modules = await listCreativeModules({
    userId: session.user.id,
    displayName: session.user.name,
    query: searchParams.q,
    kind
  });

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app">← Studio</Link>
      </div>
      <header className="dashboardHeader">
        <div>
          <p className="eyebrow">Creative Library</p>
          <h1 className="dashboardTitle">Reusable creative decisions.</h1>
          <p className="dashboardNote">
            Save aesthetics, characters, worlds, camera grammar, pacing,
            prompt modules, generation recipes and other decisions once, then
            reuse exact versions across projects.
          </p>
        </div>
        <Link className="primaryButton linkButton" href="/app/library/new">
          New library item
        </Link>
      </header>

      <form className="libraryFilters" method="get">
        <input
          aria-label="Search library"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search name, description or exact tag"
        />
        <select name="kind" defaultValue={kind ?? ""}>
          <option value="">All types</option>
          {Object.values(CreativeModuleKind).map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
        <button className="secondaryButton" type="submit">Filter</button>
      </form>

      {modules.length === 0 ? (
        <section className="emptyState">
          <h3>No matching library items.</h3>
          <p>
            Build the reusable vocabulary of your videos here. A library item
            is versioned, so an old project never silently changes when you
            refine a favorite aesthetic later.
          </p>
        </section>
      ) : (
        <section className="libraryGrid">
          {modules.map((libraryItem) => {
            const latest = libraryItem.versions[0];
            return (
              <Link
                className="libraryCard"
                href={"/app/library/" + libraryItem.id}
                key={libraryItem.id}
              >
                <div className="libraryCardTop">
                  <span>{libraryItem.kind.replaceAll("_", " ")}</span>
                  <span>{libraryItem._count.versions} version{libraryItem._count.versions === 1 ? "" : "s"}</span>
                </div>
                <h2>{libraryItem.name}</h2>
                <p>{libraryItem.description || "No description"}</p>
                <div className="tagRow">
                  {libraryItem.tags.slice(0, 6).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <div className="libraryVersionMeta">
                  Latest v{latest?.versionNumber ?? "—"} · {latest?.lifecycle ?? "—"}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
