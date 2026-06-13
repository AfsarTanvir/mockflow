import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuthUser } from '@/services/auth';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { User } from '@/types';

// Reads the auth cookie on every render → must not be statically prerendered.
// Cascades to all /admin/* routes.
export const dynamic = 'force-dynamic';

/**
 * Platform-admin (master agency) section. SSR-gated: only users flagged
 * `isSuperAdmin` by `/auth/me` may enter — everyone else is bounced back to
 * their dashboard. The API enforces the same rule on every `/api/admin/*` route.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: User | null = null;
  try {
    user = await getAuthUser();
  } catch {
    redirect('/auth/login');
  }

  if (!user?.isSuperAdmin) redirect('/dashboard');

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
          <AdminSidebar />
          <SidebarInset className="bg-muted/30">{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
