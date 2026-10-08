import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCreativeModule } from "@/lib/creative-library/service";
import { CreativeModuleForm } from "@/components/creative-module-form";
import { VisualAestheticForm } from "@/components/visual-aesthetic-form";

export default async function NewCreativeVersionPage(props: {
  params: Promise<{ moduleId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { moduleId } = await props.params;
  const libraryItem = await getCreativeModule({
    userId: session.user.id,
    displayName: session.user.name,
    moduleId
  });
  if (!libraryItem) notFound();

  const latest = libraryItem.versions[0];

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href={`/app/library/${libraryItem.id}`}>← {libraryItem.name}</Link>
      </div>
      <p className="eyebrow">Creative Library · new version</p>
      <h1 className="dashboardTitle">Refine without rewriting history.</h1>
      <p className="dashboardNote">
        Existing projects keep their exact pinned version. This creates a new
        reusable version for future adoption.
      </p>
      {libraryItem.kind === "VISUAL_AESTHETIC" ? (
        <VisualAestheticForm
          mode="version"
          moduleId={libraryItem.id}
          endpoint={"/api/creative-library/" + libraryItem.id + "/versions"}
          defaults={{
            definition: latest?.definition,
            positivePrompt: latest?.positivePrompt ?? "",
            negativePrompt: latest?.negativePrompt ?? "",
            notes: latest?.notes ?? "",
            referenceAssetVersionIds:
              latest?.references.map((reference) => reference.assetVersionId) ?? []
          }}
        />
      ) : (
        <section className="dashboardCard projectFormCard">
          <CreativeModuleForm
            mode="version"
            moduleId={libraryItem.id}
            endpoint={"/api/creative-library/" + libraryItem.id + "/versions"}
            defaults={{
              definition: latest
                ? JSON.stringify(latest.definition, null, 2)
                : "{}",
              positivePrompt: latest?.positivePrompt ?? "",
              negativePrompt: latest?.negativePrompt ?? "",
              notes: latest?.notes ?? ""
            }}
          />
        </section>
      )}
    </main>
  );
}
