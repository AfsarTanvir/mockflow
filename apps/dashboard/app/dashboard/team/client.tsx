'use client';

import Link from 'next/link';
import { useMyMemberships } from '@/query/teams';
import type { User, TeamRole } from '@/types';

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'bg-primary/10 text-primary',
  admin: 'bg-primary/10 text-primary',
  member: 'bg-success/10 text-success',
  viewer: 'bg-muted text-muted-foreground',
};

export default function TeamClient({ initialUser }: { initialUser: User }) {
  const { data: memberships = [], isLoading } = useMyMemberships();

  void initialUser;

  return (
    <main className="max-w-4xl mx-auto mt-8 px-6 pb-12">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Team Memberships</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projects you belong to — including your own and ones you were invited to.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Loading…</div>
      ) : memberships.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">No memberships yet</p>
          <Link
            href="/dashboard/projects"
            className="text-primary hover:underline text-sm font-medium"
          >
            Go to your projects
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {memberships.length} project{memberships.length !== 1 ? 's' : ''}
          </p>
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/projects/${m.project.id}`}
              className="bg-card rounded-xl border px-4 py-3 flex items-center gap-4 hover:border-ring transition-colors block"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {m.project.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.project.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{m.project.slug}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[m.role]}`}
              >
                {m.role}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
