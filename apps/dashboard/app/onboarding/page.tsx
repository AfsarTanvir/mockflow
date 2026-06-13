import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import { getMyCompanies } from '@/services/companies';
import OnboardingClient from './client';

// Reads the auth cookie on every render → must not be statically prerendered.
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  // Require auth — otherwise back to login
  try {
    await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  // If the user already has at least one active membership, send them to the
  // dashboard. Onboarding is only for the zero-companies case.
  let memberships: Awaited<ReturnType<typeof getMyCompanies>> = [];
  try {
    memberships = await getMyCompanies();
  } catch {
    memberships = [];
  }
  if (memberships.length > 0) redirect('/dashboard');

  return <OnboardingClient />;
}
