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
import { ADMIN_ROOT, adminNavGroups } from '@/constants/admin-nav-items';
import { cn } from '@/lib/utils';

export function AdminSidebar() {
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
          'bg-background hover:bg-accent absolute top-5 -right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-transform',
          open && 'rotate-180'
        )}
      >
        <ChevronRight className="text-muted-foreground h-3 w-3" />
      </button>

      <SidebarContent className="pt-2">
        {adminNavGroups.map((group, groupIdx, arr) => (
          <div key={groupIdx}>
            <SidebarGroup>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === ADMIN_ROOT
                      ? pathname === ADMIN_ROOT
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          'text-muted-foreground hover:bg-accent hover:text-foreground',
                          isActive &&
                            'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-medium'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
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
