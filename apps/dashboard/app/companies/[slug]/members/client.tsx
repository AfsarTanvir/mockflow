'use client';

import { useState, type FormEvent } from 'react';
import { useMyCompanies } from '@/query/companies';
import { useAddCompanyMember, useProfilesInCompany } from '@/query/profiles';
import { MemberGrid } from '@/components/dashboard/member-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import type { ProfileRole } from '@/types';

type AssignableRole = Exclude<ProfileRole, 'owner'>;

/** Owner/admin form: add an existing MockFlow user to the company by email. */
function AddMemberCard({ companyId, actorRole }: { companyId: string; actorRole: ProfileRole }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('member');
  const [added, setAdded] = useState<string | null>(null);
  const { mutate: addMember, isPending, error, reset } = useAddCompanyMember(companyId);

  // Same rule as the API: you can only grant roles below your own.
  const roleOptions: AssignableRole[] =
    actorRole === 'owner' ? ['member', 'viewer', 'admin'] : ['member', 'viewer'];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAdded(null);
    addMember(
      { email: email.trim(), role },
      {
        onSuccess: (profile) => {
          setAdded(profile.displayName);
          setEmail('');
          setRole('member');
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="memberEmail">Email</Label>
              <Input
                id="memberEmail"
                type="email"
                required
                maxLength={255}
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAdded(null);
                  if (error) reset();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memberRole">Role</Label>
              <select
                id="memberRole"
                value={role}
                onChange={(e) => setRole(e.target.value as AssignableRole)}
                className="border-input bg-background focus:ring-ring h-9 w-full rounded-lg border px-3 text-sm capitalize focus:outline-none focus:ring-2 sm:w-32"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isPending || email.trim().length === 0}>
              {isPending ? 'Adding…' : 'Add member'}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            They must already have a MockFlow account. They join immediately — no invite email is
            sent.
          </p>
          {error && <Alert variant="destructive">{error.message}</Alert>}
          {added && <p className="text-success text-xs">{added} was added to the company.</p>}
        </form>
      </CardContent>
    </Card>
  );
}

export default function CompanyMembersClient({ slug }: { slug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const membership = memberships.find((m) => m.company.slug === slug);
  const companyId = membership?.company.id ?? '';
  const actorRole = membership?.profile.role;
  const canAdd = actorRole === 'owner' || actorRole === 'admin';
  const { data: profiles = [], isLoading } = useProfilesInCompany(companyId);

  // People who left or were removed keep their (inactive) profile row; they
  // aren't members any more, so don't list them.
  const members = profiles.filter((p) => p.status !== 'inactive');

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-foreground text-base font-semibold">Members</h1>
      {canAdd && companyId && actorRole && (
        <AddMemberCard companyId={companyId} actorRole={actorRole} />
      )}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <MemberGrid
          slug={slug}
          members={members.map((p) => ({
            profileId: p.id,
            displayName: p.displayName,
            avatarUrl: p.avatarUrl,
            role: p.status === 'suspended' ? `${p.role} · suspended` : p.role,
            subtitle: p.jobTitle,
          }))}
        />
      )}
    </main>
  );
}
