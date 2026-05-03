import { getAuthUser } from '@/services/auth';
import DashboardClient from './client';

export default async function DashboardPage() {
  const user = await getAuthUser();
  return <DashboardClient initialUser={user} />;
}
