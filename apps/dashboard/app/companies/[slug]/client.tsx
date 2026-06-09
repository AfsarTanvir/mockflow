'use client';

import Link from 'next/link';
import { Settings, Users, UsersRound, type LucideIcon } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

export default function CompanyOverviewClient({ slug }: { slug: string }) {
  const { data: memberships = [], isLoading } = useMyCompanies();
  const membership = memberships.find((m) => m.company.slug === slug);
  const role = membership?.profile.role;
  const isAdmin = role === 'owner' || role === 'admin';

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </main>
    );
  }

  const tiles: { label: string; desc: string; href: string; icon: LucideIcon; show: boolean }[] = [
    {
      label: 'Members',
      desc: 'Browse company members',
      href: `/companies/${slug}/members`,
      icon: Users,
      show: true,
    },
    {
      label: 'Teams',
      desc: 'Workspace teams',
      href: `/companies/${slug}/teams`,
      icon: UsersRound,
      show: true,
    },
    {
      label: 'Company settings',
      desc: 'Name & logo (owner/admin)',
      href: `/companies/${slug}/settings`,
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Company header — the COMPANY logo */}
      <div className="flex items-center gap-3">
        <Avatar className="size-12 rounded-lg">
          <AvatarImage
            src={membership?.company.logoUrl ?? membership?.company.avatarUrl ?? undefined}
          />
          <AvatarFallback className="bg-primary/10 text-primary rounded-lg font-semibold">
            {initials(membership?.company.name ?? '?')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-foreground text-lg font-semibold">{membership?.company.name}</h1>
          <p className="text-muted-foreground text-sm capitalize">You are {role}</p>
        </div>
      </div>

      {/* Your profile in this company — the PROFILE avatar */}
      <Link href={`/companies/${slug}/me`} className="block">
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={membership?.profile.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                {initials(membership?.profile.displayName ?? '?')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                {membership?.profile.displayName}
              </p>
              <p className="text-muted-foreground text-xs">
                Your profile in this company — tap to edit
              </p>
            </div>
            <span className="text-primary shrink-0 text-sm font-medium">Edit →</span>
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles
          .filter((t) => t.show)
          .map((t) => (
            <Link key={t.href} href={t.href} className="group">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <t.icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium">{t.label}</p>
                    <p className="text-muted-foreground text-xs">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </main>
  );
}
