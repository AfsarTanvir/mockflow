'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
import { dashboardNavGroups } from '@/constants/nav-items';
import { cn } from '@/lib/utils';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { open, toggleSidebar } = useSidebar();

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
          'absolute top-5 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm transition-transform hover:bg-gray-50',
          open && 'rotate-180'
        )}
      >
        <ChevronRight className="h-3 w-3 text-gray-500" />
      </button>

      <SidebarContent className="bg-white pt-2">
        {dashboardNavGroups.map((group, groupIdx, arr) => (
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
                        'text-gray-600 hover:bg-blue-50 hover:text-blue-600',
                        isActive && 'bg-blue-50 text-blue-600 font-medium',
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
