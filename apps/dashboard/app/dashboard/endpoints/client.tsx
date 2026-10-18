'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/query/auth';
import { useMyEndpoints } from '@/query/endpoints';
import { MethodBadge } from '@/components/dashboard/method-badge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { EndpointWithProject, User } from '@/types';

/** The path a mock request uses: /mock/<slug><basePath><path> ("/" = no base path). */
function mockPath(e: EndpointWithProject) {
  const base = e.project.basePath === '/' ? '' : e.project.basePath;
  return `/mock/${e.project.slug}${base}${e.path}`;
}

export default function EndpointsClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });
  const { data: endpoints = [], isLoading, error } = useMyEndpoints();
  const [search, setSearch] = useState('');

  if (!user) return null;

  const q = search.trim().toLowerCase();
  const shown = q
    ? endpoints.filter((e) =>
        `${e.method} ${mockPath(e)} ${e.project.name}`.toLowerCase().includes(q)
      )
    : endpoints;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-foreground text-lg font-semibold">Endpoints</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every mock endpoint in your projects. Open one to edit it in its project.
        </p>
      </div>

      {endpoints.length > 0 && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by method, path or project…"
          aria-label="Search endpoints"
          className="mb-4 sm:max-w-sm"
        />
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
          {error instanceof Error ? error.message : 'Failed to load endpoints'}
        </div>
      ) : endpoints.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-sm">No endpoints yet</p>
          <Link href="/dashboard/projects" className="text-primary mt-2 text-sm hover:underline">
            Add one from a project
          </Link>
        </Card>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No endpoints match “{search}”.
        </p>
      ) : (
        <div className="grid gap-3">
          {shown.map((e) => (
            <Link key={e.id} href={`/dashboard/projects/${e.project.id}`} className="group min-w-0">
              <Card className="flex-row items-center gap-3 p-4">
                <MethodBadge method={e.method} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground group-hover:text-primary truncate font-mono text-sm transition-colors">
                    {mockPath(e)}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{e.project.name}</p>
                </div>
                {!e.isActive && <Badge variant="muted">Inactive</Badge>}
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {e.statusCode}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
