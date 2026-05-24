import { getAuthUser } from '@/services/auth';
import TeamsListClient from './client';

export default async function TeamsPage() {
  const user = await getAuthUser();
  return <TeamsListClient initialUser={user} />;
}
