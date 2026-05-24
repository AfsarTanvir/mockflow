'use client';

import { LogOut, User } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { CompanySwitcher } from './company-switcher';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignOut } from '@/query/auth';
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
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b bg-white px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-gray-500 hover:text-gray-900" />
        <Separator orientation="vertical" className="h-5" />
        <Link href="/dashboard" className="flex items-center gap-2 ml-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold">
            M
          </div>
          <span className="text-sm font-bold text-gray-900">MockFlow</span>
        </Link>
        <Separator orientation="vertical" className="h-5 ml-2" />
        <CompanySwitcher />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors outline-none" />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-gray-900 leading-none">{user.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-none">{user.email}</p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52" sideOffset={4}>
            <div className="flex items-center gap-3 px-2 py-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              disabled={isPending}
              className="text-red-600 focus:text-red-600"
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
