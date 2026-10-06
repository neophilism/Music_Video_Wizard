import { redirect } from "next/navigation";

export default async function ProjectPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;
  redirect(`/app/projects/${projectId}/wizard`);
}
