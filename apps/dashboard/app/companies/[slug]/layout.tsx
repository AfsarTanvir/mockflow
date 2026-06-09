import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/services/auth';
import { getMyCompanies } from '@/services/companies';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

/**
 * Company workspace shell (/companies/:slug/…). Auth-gated, and gated on
 * membership of this specific company (non-members are bounced to /dashboard).
 * Reuses the same app shell as the personal area for consistent chrome.
 */
export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  try {
    const memberships = await getMyCompanies();
    if (!memberships.some((m) => m.company.slug === slug)) redirect('/dashboard');
  } catch (e) {
    // rethrow redirect; tolerate a transient fetch failure (page re-checks)
    if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) throw e;
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
