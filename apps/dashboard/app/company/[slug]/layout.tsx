import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/services/auth';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

/**
 * Top-level company section (e.g. /company/:slug/profile). Auth-gated and uses
 * the same app shell as /dashboard so the chrome stays consistent. Membership
 * for the specific slug is checked inside the page.
 */
export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  let user = null;

  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={{ '--app-header-h': '3.5rem' } as React.CSSProperties}
    >
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
