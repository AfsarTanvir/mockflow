import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import ProjectsClient from './client';

export default async function ProjectsPage() {
  let user = null;

  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  return <ProjectsClient initialUser={user} />;
}
