'use client';

import Link from 'next/link';
import {
  Building2,
  FolderOpen,
  IdCard,
  ScrollText,
  TrendingUp,
  Users,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { useAdminStats } from '@/query/admin';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/format';
import type { PlatformStats } from '@/types/admin';

const STAT_DEFS: {
  key: keyof PlatformStats['counts'];
  label: string;
  icon: LucideIcon;
  href: string;
}[] = [
  { key: 'companies', label: 'Companies', icon: Building2, href: '/admin/companies' },
  { key: 'users', label: 'Users', icon: Users, href: '/admin/users' },
  { key: 'profiles', label: 'Profiles', icon: IdCard, href: '/admin/profiles' },
  { key: 'teams', label: 'Teams', icon: UsersRound, href: '/admin/teams' },
  { key: 'projects', label: 'Projects', icon: FolderOpen, href: '/admin/projects' },
  { key: 'endpoints', label: 'Endpoints', icon: Zap, href: '/admin/endpoints' },
  { key: 'requestLogs', label: 'Request Logs', icon: ScrollText, href: '/admin/request-logs' },
];

export function AdminOverviewClient() {
  const { data, isLoading, isError } = useAdminStats();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Platform overview"
        description="Cross-tenant totals and recent activity across the whole platform."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}

        {!isLoading &&
          data &&
          STAT_DEFS.map((stat) => (
            <Link key={stat.key} href={stat.href} className="group">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="space-y-2">
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <stat.icon className="size-4" />
                  </div>
                  <p className="text-foreground text-2xl font-semibold tabular-nums">
                    {data.counts[stat.key].toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}

        {!isLoading && data && (
          <Card className="bg-primary/5 border-primary/20 h-full">
            <CardContent className="space-y-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <TrendingUp className="size-4" />
              </div>
              <p className="text-foreground text-2xl font-semibold tabular-nums">
                {data.signupsLast7d.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs">New signups (7d)</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-foreground text-sm font-semibold">Recent signups</h2>
        <div className="bg-card overflow-hidden rounded-xl border">
          {isError ? (
            <p className="text-destructive p-6 text-center text-sm">Failed to load stats.</p>
          ) : isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : data && data.recentUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-foreground font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No signups yet" className="rounded-none border-0" />
          )}
        </div>
      </div>
    </div>
  );
}
