import { getAuthUser } from '@/services/auth';
import AccountClient from './client';

export default async function AccountPage() {
  const user = await getAuthUser();
  return <AccountClient initialUser={user} />;
}
