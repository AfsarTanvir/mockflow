import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import { getProject } from '@/services/projects';
// Reuse the full project-detail UI (endpoints, history, logs, settings).
// Access is enforced server-side by getProject → assertProjectAccess.
import ProjectDetailClient from '../../../../../../dashboard/projects/[id]/client';

export default async function TeamProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string; teamSlug: string; id: string }>;
}) {
  const { slug, teamSlug, id } = await params;

  const [user, project] = await Promise.all([getAuthUser(), getProject(id).catch(() => null)]);

  if (!project) redirect(`/companies/${slug}/teams/${teamSlug}/projects`);

  return <ProjectDetailClient initialUser={user} initialProject={project} />;
}
