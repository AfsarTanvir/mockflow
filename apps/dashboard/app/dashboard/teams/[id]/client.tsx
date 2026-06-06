'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, UserPlus, Trash2, Crown } from 'lucide-react';
import { useWorkspaceTeam, useDeleteWorkspaceTeam } from '@/query/teams';
import { useMyProfile } from '@/query/profiles';
import { useProfilesInCompany } from '@/query/profiles';
import {
  useTeamMembers,
  useAddTeamMember,
  useChangeTeamMemberRole,
  useRemoveTeamMember,
} from '@/query/team-memberships';
import { useConfirm } from '@/providers/ConfirmProvider';
import type { User, WorkspaceTeamRole } from '@/types';

interface Props {
  initialUser: User;
  teamId: string;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamDetailClient({ initialUser, teamId }: Props) {
  const router = useRouter();
  const { data: team, isLoading: teamLoading } = useWorkspaceTeam(teamId);
  const companyId = team?.companyId ?? '';

  const { data: myProfile } = useMyProfile(companyId);
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: companyProfiles = [] } = useProfilesInCompany(companyId);

  const myMembership = members.find((m) => m.profileId === myProfile?.id);
  const isCompanyAdmin = myProfile?.role === 'owner' || myProfile?.role === 'admin';
  const isTeamAdmin = myMembership?.role === 'admin';
  const canManage = isCompanyAdmin || isTeamAdmin;

  const { mutate: deleteTeam, isPending: deleting } = useDeleteWorkspaceTeam(companyId);
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete team?',
      description: `"${team?.name}" will be permanently deleted. This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteTeam(teamId, {
      onSuccess: () => router.push('/dashboard/teams'),
    });
  }

  if (teamLoading || !team) {
    return (
      <main className="max-w-4xl mx-auto mt-8 px-6 pb-12">
        <p className="text-sm text-muted-foreground">Loading team…</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto mt-8 px-6 pb-12">
      <Link
        href="/dashboard/teams"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to teams
      </Link>

      <div className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: team.color ?? '#dbeafe', color: '#1d4ed8' }}
          >
            {initials(team.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground">{team.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {team.visibility.replace(/_/g, ' ')}
            </p>
            {team.description && (
              <p className="text-sm text-muted-foreground mt-2">{team.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {team.totalMember} member{team.totalMember === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {canManage && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete team'}
            </button>
          )}
        </div>
      </div>

      <section className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
        </div>

        {canManage && (
          <AddMemberForm
            teamId={teamId}
            companyId={companyId}
            existingMemberProfileIds={members.map((m) => m.profileId)}
            companyProfiles={companyProfiles}
          />
        )}

        {membersLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No members yet.</p>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                membership={m}
                teamId={teamId}
                companyId={companyId}
                canManage={canManage}
                isSelf={m.profileId === myProfile?.id}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="hidden">{initialUser.id}</div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function AddMemberForm({
  teamId,
  companyId,
  existingMemberProfileIds,
  companyProfiles,
}: {
  teamId: string;
  companyId: string;
  existingMemberProfileIds: string[];
  companyProfiles: Array<{ id: string; displayName: string; status: string }>;
}) {
  const { mutate: addMember, isPending, error } = useAddTeamMember(teamId, companyId);
  const [profileId, setProfileId] = useState('');
  const [role, setRole] = useState<WorkspaceTeamRole>('member');

  const eligible = companyProfiles.filter(
    (p) => p.status === 'active' && !existingMemberProfileIds.includes(p.id)
  );

  function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) return;
    addMember(
      { profileId, role },
      {
        onSuccess: () => {
          setProfileId('');
          setRole('member');
        },
      }
    );
  }

  if (eligible.length === 0) {
    return (
      <div className="bg-muted border border-dashed rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground text-center">
        Every active company profile is already on this team.
      </div>
    );
  }

  return (
    <form onSubmit={handle} className="flex items-center gap-2 mb-4 pb-4 border-b">
      <select
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        className="flex-1 px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Pick a profile to add…</option>
        {eligible.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as WorkspaceTeamRole)}
        className="px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        disabled={!profileId || isPending}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Add
      </button>
      {error && <span className="text-xs text-destructive ml-2">{(error as Error).message}</span>}
    </form>
  );
}

function MemberRow({
  membership,
  teamId,
  companyId,
  canManage,
  isSelf,
}: {
  membership: ReturnType<typeof useTeamMembers>['data'] extends (infer T)[] | undefined ? T : never;
  teamId: string;
  companyId: string;
  canManage: boolean;
  isSelf: boolean;
}) {
  const { mutate: changeRole, isPending: changing } = useChangeTeamMemberRole(teamId, companyId);
  const { mutate: removeMember, isPending: removing } = useRemoveTeamMember(teamId, companyId);
  const confirm = useConfirm();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
        {membership.profile ? initials(membership.profile.displayName) : '??'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {membership.profile?.displayName ?? 'Unknown profile'}
        </p>
        <p className="text-[11px] text-muted-foreground capitalize">
          {membership.profile?.companyRole}
          {membership.profile?.status !== 'active' && (
            <span className="ml-1 text-destructive">· {membership.profile?.status}</span>
          )}
        </p>
      </div>

      {membership.role === 'admin' && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          <Crown className="h-2.5 w-2.5" />
          Team admin
        </span>
      )}

      {canManage && !isSelf && (
        <>
          {membership.role === 'member' ? (
            <button
              onClick={() => changeRole({ profileId: membership.profileId, role: 'admin' })}
              disabled={changing}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Promote
            </button>
          ) : (
            <button
              onClick={() => changeRole({ profileId: membership.profileId, role: 'member' })}
              disabled={changing}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Demote
            </button>
          )}
          <button
            onClick={async () => {
              const ok = await confirm({
                title: 'Remove member?',
                description: 'They will be removed from this team.',
                confirmText: 'Remove',
                destructive: true,
              });
              if (ok) removeMember(membership.profileId);
            }}
            disabled={removing}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Remove from team"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {isSelf && canManage && <span className="text-[10px] text-muted-foreground">(you)</span>}
    </li>
  );
}
