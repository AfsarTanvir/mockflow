'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2, Trash2, UserMinus } from 'lucide-react';
import {
  useTeam,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useRevokeInvite,
} from '@/query/teams';
import { inviteMemberSchema, type InviteMemberInput } from '@/schema/teams';
import type { TeamRole } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'bg-primary/10 text-primary',
  admin: 'bg-primary/10 text-primary',
  member: 'bg-success/10 text-success',
  viewer: 'bg-muted text-muted-foreground',
};

const ROLE_RANK: Record<TeamRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span
      className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', ROLE_COLORS[role])}
    >
      {role}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      title="Copy invite link"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

type TeamPanelProps = {
  projectId: string;
  currentUserId: string;
};

export function TeamPanel({ projectId, currentUserId }: TeamPanelProps) {
  const { data: team, isLoading } = useTeam(projectId);
  const { mutate: invite, isPending: inviting, error: inviteError } = useInviteMember(projectId);
  const { mutate: updateRole } = useUpdateMemberRole(projectId);
  const { mutate: removeMember } = useRemoveMember(projectId);
  const { mutate: revokeInvite } = useRevokeInvite(projectId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const canManage = team ? ROLE_RANK[team.currentUserRole] >= ROLE_RANK['admin'] : false;

  function handleInvite(data: InviteMemberInput) {
    invite(data, { onSuccess: () => reset() });
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-12">Loading team…</div>;
  }

  if (!team) return null;

  return (
    <div className="space-y-6">
      {/* Invite form — owner/admin only */}
      {canManage && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Invite a team member</h3>
          <form onSubmit={handleSubmit(handleInvite)} noValidate>
            {inviteError && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {inviteError.message}
              </div>
            )}
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="email"
                  {...register('email')}
                  placeholder="colleague@example.com"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring',
                    errors.email ? 'border-destructive' : 'border-input'
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <select
                {...register('role')}
                className="w-32 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                {team.currentUserRole === 'owner' && <option value="admin">Admin</option>}
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Members ({team.members.length})
        </h3>
        {team.members.map((member) => {
          const isSelf = member.user.id === currentUserId;
          const canAct = canManage && member.role !== 'owner' && !isSelf;
          const initials = member.user.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div
              key={member.id}
              className="bg-card rounded-xl border px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {member.user.name}
                  {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
              </div>
              <RoleBadge role={member.role} />
              {canAct && (
                <div className="flex items-center gap-2 ml-2">
                  <select
                    defaultValue={member.role}
                    onChange={(e) =>
                      updateRole({
                        memberId: member.id,
                        body: { role: e.target.value as Exclude<TeamRole, 'owner'> },
                      })
                    }
                    className="text-xs border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    {team.currentUserRole === 'owner' && <option value="admin">Admin</option>}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${member.user.name} from this project?`)) {
                        removeMember(member.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove member"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      {team.invites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pending Invites ({team.invites.length})
          </h3>
          {team.invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-card rounded-xl border px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-dashed border-2 border-dashed border-input flex items-center justify-center shrink-0">
                <span className="text-muted-foreground text-xs">?</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited {new Date(invite.createdAt).toLocaleDateString()}
                </p>
              </div>
              <RoleBadge role={invite.role} />
              <CopyButton text={getInviteUrl(invite.token)} />
              {canManage && (
                <button
                  onClick={() => {
                    if (confirm(`Revoke invite for ${invite.email}?`)) {
                      revokeInvite(invite.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  title="Revoke invite"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {team.members.length === 1 && team.invites.length === 0 && !canManage && (
        <p className="text-sm text-muted-foreground text-center py-6">No other team members yet.</p>
      )}
    </div>
  );
}
