'use client';

import { Building2, LogOut, User } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { CompanySwitcher } from './company-switcher';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignOut } from '@/query/auth';
import { getActiveCompanyClient } from '@/lib/active-company';
import type { User as UserType } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardHeader({ user }: { user: UserType }) {
  const router = useRouter();
  const { mutate: signOut, isPending } = useSignOut();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex h-14 w-full items-center border-b px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-5" />
        <Link href="/dashboard" className="ml-1 flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold">
            M
          </div>
          <span className="text-foreground hidden text-sm font-bold sm:inline">MockFlow</span>
        </Link>
        <Separator orientation="vertical" className="ml-2 h-5" />
        <CompanySwitcher />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="hover:bg-muted flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors" />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-foreground text-xs leading-none font-medium">{user.name}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-none">{user.email}</p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52" sideOffset={4}>
            <div className="flex items-center gap-3 px-2 py-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/me')}>
              <User className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const slug = getActiveCompanyClient();
                router.push(slug ? `/companies/${slug}/me` : '/dashboard');
              }}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Company profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isPending ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
