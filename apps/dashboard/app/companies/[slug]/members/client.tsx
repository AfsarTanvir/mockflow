'use client';

import { useMyCompanies } from '@/query/companies';
import { useProfilesInCompany } from '@/query/profiles';
import { MemberGrid } from '@/components/dashboard/member-grid';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompanyMembersClient({ slug }: { slug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const companyId = memberships.find((m) => m.company.slug === slug)?.company.id ?? '';
  const { data: profiles = [], isLoading } = useProfilesInCompany(companyId);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-foreground text-base font-semibold">Members</h1>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <MemberGrid
          slug={slug}
          members={profiles.map((p) => ({
            profileId: p.id,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            role: p.role,
            subtitle: p.jobTitle,
          }))}
        />
      )}
    </main>
  );
}
