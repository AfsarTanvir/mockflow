'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Users, Globe, Lock, Building2 } from 'lucide-react';
import { useMyCompanies } from '@/query/companies';
import { useMyProfile } from '@/query/profiles';
import { useWorkspaceTeams, useCreateWorkspaceTeam } from '@/query/teams';
import { getActiveCompanyClient } from '@/lib/active-company';
import { createTeamSchema, type CreateTeamInput } from '@/schema/teams';
import type { User, TeamVisibility } from '@/types';

interface Props {
  initialUser: User;
}

function VisibilityBadge({ visibility }: { visibility: TeamVisibility }) {
  if (visibility === 'public') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-success/10 text-success px-1.5 py-0.5 rounded">
        <Globe className="h-2.5 w-2.5" /> Public
      </span>
    );
  }
  if (visibility === 'company_member_only') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
        <Building2 className="h-2.5 w-2.5" /> Company members
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
      <Lock className="h-2.5 w-2.5" /> Private
    </span>
  );
}

export default function TeamsListClient({ initialUser }: Props) {
  const { data: memberships = [], isLoading: companiesLoading } = useMyCompanies();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    setActiveSlug(getActiveCompanyClient());
  }, []);

  const active = memberships.find((m) => m.company.slug === activeSlug) ?? memberships[0];
  const companyId = active?.company.id ?? '';
  const actorRole = active?.profile.role;

  const { data: teams = [], isLoading } = useWorkspaceTeams(companyId);
  const { data: myProfile } = useMyProfile(companyId);

  const [showCreate, setShowCreate] = useState(false);

  const canCreate = actorRole === 'owner' || actorRole === 'admin' || actorRole === 'member'; // settings.members_can_create_teams gating happens server-side; surface anyway

  if (companiesLoading || !active) {
    return (
      <main className="max-w-5xl mx-auto mt-8 px-6 pb-12">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto mt-8 px-6 pb-12">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organise <span className="font-medium">{active.company.name}</span> profiles into teams.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {showCreate ? 'Cancel' : 'New team'}
          </button>
        )}
      </div>

      {showCreate && canCreate && (
        <CreateTeamForm
          companyId={companyId}
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading teams…</p>
      ) : teams.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No teams yet.</p>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-primary hover:underline font-medium"
            >
              Create the first team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/teams/${t.id}`}
              className="block bg-card border rounded-xl p-4 hover:border-ring hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-md flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ backgroundColor: t.color ?? '#dbeafe', color: '#1d4ed8' }}
                >
                  {t.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                    <VisibilityBadge visibility={t.visibility} />
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {t.totalMember}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Suppress unused warnings while myProfile / initialUser may be used later for richer perms */}
      <div className="hidden">
        {initialUser.id} {myProfile?.id}
      </div>
    </main>
  );
}

function CreateTeamForm({
  companyId,
  onSuccess,
  onCancel,
}: {
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { mutate: createTeam, isPending, error } = useCreateWorkspaceTeam(companyId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', visibility: 'private' },
  });

  function handle(data: CreateTeamInput) {
    createTeam(data, { onSuccess });
  }

  return (
    <form
      onSubmit={handleSubmit(handle)}
      className="bg-card border rounded-xl p-5 mb-5 space-y-4"
      noValidate
    >
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          {(error as Error).message}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Team name</label>
        <input
          type="text"
          {...register('name')}
          placeholder="e.g. Backend, Design, Customer Success"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.name ? 'border-destructive' : 'border-input'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          {...register('description')}
          placeholder="What does this team work on?"
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Visibility</label>
        <select
          {...register('visibility')}
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="private">Private — only team members can see</option>
          <option value="company_member_only">Company members can see the team exists</option>
          <option value="public">Public — visible if company is also public</option>
        </select>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Creating…' : 'Create team'}
        </button>
      </div>
    </form>
  );
}
