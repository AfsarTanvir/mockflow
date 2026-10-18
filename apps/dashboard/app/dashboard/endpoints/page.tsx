import { getAuthUser } from '@/services/auth';
import EndpointsClient from './client';

export default async function EndpointsPage() {
  const user = await getAuthUser();
  return <EndpointsClient initialUser={user} />;
}
