import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import DashboardClient from './client';

export default async function DashboardPage() {
  let user = null;

  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  return <DashboardClient initialUser={user} />;
}
