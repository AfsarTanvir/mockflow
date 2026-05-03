import { redirect } from 'next/navigation';
import { getAuthUser } from '@/services/auth';
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

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex min-h-screen w-full flex-col">
        <DashboardHeader user={user} />
        <div className="flex flex-1">
          <DashboardSidebar />
          <SidebarInset className="bg-gray-50">{children}</SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
