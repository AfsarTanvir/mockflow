'use client';

import Link from 'next/link';
import { UsersRound } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { useWorkspaceTeams } from '@/query/teams';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function CompanyTeamsClient({ slug }: { slug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const companyId = memberships.find((m) => m.company.slug === slug)?.company.id ?? '';
  const { data: teams = [], isLoading } = useWorkspaceTeams(companyId);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-foreground text-base font-semibold">Teams</h1>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No teams yet"
          description="This company has no teams."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/companies/${slug}/teams/${t.slug}/members`}
              className="bg-card hover:border-primary/40 rounded-xl border p-4 transition-colors"
            >
              <p className="text-foreground text-sm font-medium">{t.name}</p>
              {t.description && (
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{t.description}</p>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                {t.totalMember} members · {t.totalProject} projects
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
