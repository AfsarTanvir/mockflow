'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { useWorkspaceTeams } from '@/query/teams';
import { useTeamMembers } from '@/query/team-memberships';
import { MemberGrid } from '@/components/dashboard/member-grid';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamMembersClient({ slug, teamSlug }: { slug: string; teamSlug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const companyId = memberships.find((m) => m.company.slug === slug)?.company.id ?? '';
  const { data: teams = [] } = useWorkspaceTeams(companyId);
  const team = teams.find((t) => t.slug === teamSlug);
  const { data: members = [], isLoading } = useTeamMembers(team?.id ?? '');

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link
        href={`/companies/${slug}/teams`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Teams
      </Link>
      <h1 className="text-foreground text-base font-semibold">
        {team?.name ?? 'Team'} <span className="text-muted-foreground font-normal">· members</span>
      </h1>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <MemberGrid
          slug={slug}
          members={members
            .filter((m) => m.profile)
            .map((m) => ({
              profileId: m.profile!.id,
              displayName: m.profile!.displayName,
              avatarUrl: m.profile!.avatarUrl,
              role: m.role,
              subtitle: m.profile!.companyRole,
            }))}
        />
      )}
    </main>
  );
}
