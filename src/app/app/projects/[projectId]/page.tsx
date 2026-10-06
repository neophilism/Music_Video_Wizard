import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AssetStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAssetStorage } from "@/lib/storage";

export default async function ProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) redirect("/sign-in");

  const { projectId } = await params;
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      workspace: {
        memberships: {
          some: { userId: session.user.id }
        }
      }
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          audioMasterAssetVersion: {
            include: { asset: true }
          }
        }
      }
    }
  });

  if (!project) notFound();

  const version = project.versions[0];
  if (!version) notFound();

  const audio = version.audioMasterAssetVersion;
  const audioUrl =
    audio && audio.status === AssetStatus.READY
      ? await createAssetStorage().getSignedReadUrl(audio.storageKey, 60 * 30)
      : null;

  return (
    <main className="dashboardShell">
      <div className="pageBack">
        <Link href="/app">← Studio</Link>
      </div>
      <p className="eyebrow">Project</p>
      <h1 className="dashboardTitle">{project.title}</h1>
      {project.description ? (
        <p className="dashboardNote">{project.description}</p>
      ) : null}

      <section className="dashboardCard">
        <div className="projectMeta projectMetaLarge">
          <span>{version.aspectRatio}</span>
          <span>{version.outputWidth} × {version.outputHeight}</span>
          <span>{version.frameRate} fps</span>
        </div>

        <p className="dashboardLabel">Immutable master audio</p>
        <p className="dashboardValue">
          {audio?.asset.name ?? "Audio unavailable"}
        </p>

        {audioUrl ? (
          <audio className="audioPlayer" controls preload="metadata" src={audioUrl}>
            Your browser does not support audio playback.
          </audio>
        ) : (
          <p className="dashboardNote">Audio is not ready for playback.</p>
        )}
      </section>

      <section className="nextStepCard">
        <p className="eyebrow">Next wizard stage</p>
        <h2>Music analysis</h2>
        <p>
          PR 11 will derive waveform, beat, section, and energy data. Until
          then, this project safely preserves the finished music and project
          output settings without pretending analysis has occurred.
        </p>
      </section>
    </main>
  );
}
