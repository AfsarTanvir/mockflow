import { getAuthUser } from '@/services/auth';
import ProfileSettingsClient from './client';

export default async function ProfileSettingsPage() {
  const user = await getAuthUser();
  return <ProfileSettingsClient initialUser={user} />;
}
