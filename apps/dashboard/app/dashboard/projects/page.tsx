import { getAuthUser } from '@/services/auth';
import ProjectsClient from './client';

export default async function ProjectsPage() {
  const user = await getAuthUser();
  return <ProjectsClient initialUser={user} />;
}
