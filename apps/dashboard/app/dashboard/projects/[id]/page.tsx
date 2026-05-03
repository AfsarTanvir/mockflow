import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import { getProject } from '@/services/projects';
import ProjectDetailClient from './client';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, project] = await Promise.all([getAuthUser(), getProject(id).catch(() => null)]);

  if (!project) redirect('/dashboard/projects');

  return <ProjectDetailClient initialUser={user} initialProject={project} />;
}
