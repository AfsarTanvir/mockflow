import { getAuthUser } from '@/services/auth';
import TeamDetailClient from './client';

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  const { id } = await params;
  return <TeamDetailClient initialUser={user} teamId={id} />;
}
