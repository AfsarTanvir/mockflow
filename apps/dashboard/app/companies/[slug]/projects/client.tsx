'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { useCompanyProjects } from '@/query/projects';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export default function CompanyProjectsClient({ slug }: { slug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const me = memberships.find((m) => m.company.slug === slug);
  const companyId = me?.company.id ?? '';
  const companyRole = me?.profile.role;
  const isAdmin = companyRole === 'owner' || companyRole === 'admin';

  // Only owners/admins can read the company-wide list (backend enforces too).
  const { data: projects = [], isLoading } = useCompanyProjects(isAdmin ? companyId : '');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Distinct teams present in the list, for the filter bar.
  const teamsById = new Map<string, { id: string; name: string; slug: string }>();
  for (const p of projects) if (p.team) teamsById.set(p.team.id, p.team);
  const teams = [...teamsById.values()];

  const filtered =
    teamFilter === 'all' ? projects : projects.filter((p) => p.team?.id === teamFilter);

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
        <h1 className="text-foreground text-base font-semibold">Projects</h1>
        <EmptyState
          icon={FolderGit2}
          title="Owners & admins only"
          description="The company-wide project list is visible to owners and admins. Open a team to see its projects."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-foreground text-base font-semibold">
        Projects <span className="text-muted-foreground font-normal">· all teams</span>
      </h1>

      {teams.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {[{ id: 'all', name: 'All' }, ...teams].map((t) => {
            const active = teamFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTeamFilter(t.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Projects created by this company's teams will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((project) => (
            <Card key={project.id} className="flex-row items-center justify-between p-5">
              <Link
                href={
                  project.team
                    ? `/companies/${slug}/teams/${project.team.slug}/projects/${project.id}`
                    : `/dashboard/projects/${project.id}`
                }
                className="group min-w-0 flex-1"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground group-hover:text-primary text-sm font-semibold transition-colors">
                    {project.name}
                  </h3>
                  {project.isPublic && <Badge variant="success">Public</Badge>}
                </div>
                <p className="text-muted-foreground font-mono text-xs">/{project.slug}</p>
              </Link>
              {project.team && (
                <Link
                  href={`/companies/${slug}/teams/${project.team.slug}/projects`}
                  className="ml-4 shrink-0"
                >
                  <Badge variant="muted">{project.team.name}</Badge>
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
