import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import { getProject } from '@/services/projects';
import ProjectDetailClient from './client';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  let project = null;
  try {
    project = await getProject(id);
  } catch {
    redirect('/dashboard/projects');
  }

  return <ProjectDetailClient initialUser={user} initialProject={project} />;
}
