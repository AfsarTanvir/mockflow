import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
import { getMyCompanies } from '@/services/companies';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user = null;

  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  // If the user has no active company memberships, push them through onboarding.
  // We tolerate a failed fetch (network blip) by letting them through; the
  // switcher in the header will simply show its loading state.
  try {
    const memberships = await getMyCompanies();
    if (memberships.length === 0) redirect('/onboarding');
  } catch (e) {
    // `redirect()` throws a NEXT_REDIRECT; rethrow so Next handles it. Anything
    // else (e.g. API timeout) is swallowed so the user isn't blocked.
    if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) throw e;
  }

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardSidebar showAdmin={!!user.isSuperAdmin} />
          <SidebarInset className="bg-muted/30">{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
