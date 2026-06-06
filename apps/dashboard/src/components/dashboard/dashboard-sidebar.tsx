'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Shield } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dashboardNavGroups, type NavGroup } from '@/constants/nav-items';
import { cn } from '@/lib/utils';

/** Super-admins get an extra "Admin" entry that opens the master agency console. */
const ADMIN_GROUP: NavGroup = {
  items: [{ label: 'Admin', icon: Shield, href: '/admin' }],
};

export function DashboardSidebar({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const { open, toggleSidebar } = useSidebar();
  const navGroups = showAdmin ? [...dashboardNavGroups, ADMIN_GROUP] : dashboardNavGroups;

  function handleToggle() {
    const next = !open;
    document.cookie = `sidebar_state=${next}; path=/; max-age=${60 * 60 * 24 * 30}`;
    toggleSidebar();
  }

  return (
    <Sidebar collapsible="icon">
      <button
        onClick={handleToggle}
        className={cn(
          'bg-background hover:bg-accent absolute top-5 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-transform',
          open && 'rotate-180'
        )}
      >
        <ChevronRight className="text-muted-foreground h-3 w-3" />
      </button>

      <SidebarContent className="pt-2">
        {navGroups.map((group, groupIdx, arr) => (
          <div key={groupIdx}>
            <SidebarGroup>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);

                  const button = (
                    <SidebarMenuButton
                      render={item.disabled ? undefined : <Link href={item.href} />}
                      isActive={isActive}
                      disabled={item.disabled}
                      tooltip={item.label}
                      className={cn(
                        'text-muted-foreground hover:bg-accent hover:text-foreground',
                        isActive &&
                          'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-medium',
                        item.disabled && 'pointer-events-none opacity-40'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.href}>
                      {item.disabled ? (
                        <Tooltip>
                          <TooltipTrigger render={<div />}>{button}</TooltipTrigger>
                          <TooltipContent side="right">Coming soon</TooltipContent>
                        </Tooltip>
                      ) : (
                        button
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
            {groupIdx < arr.length - 1 && <SidebarSeparator />}
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
