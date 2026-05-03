import { getAuthUser } from '@/services/auth';
import TeamClient from './client';

export default async function TeamPage() {
  const user = await getAuthUser();
  return <TeamClient initialUser={user} />;
}
