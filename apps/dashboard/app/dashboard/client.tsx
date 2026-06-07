'use client';

import Link from 'next/link';
import { useUser } from '@/query/auth';
import type { User } from '@/types';

export default function DashboardClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });

  if (!user) return null;

  return (
    <main className="max-w-2xl mx-auto mt-10 px-6 space-y-6">
      <div className="bg-card rounded-xl border p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Projects</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage your mock APIs</p>
        </div>
        <Link
          href="/dashboard/projects"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          View Projects
        </Link>
      </div>

      <div className="bg-card flex items-center justify-between rounded-xl border p-5">
        <div>
          <h3 className="text-foreground text-sm font-semibold">Account</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Update your avatar, display name and password
          </p>
        </div>
        <Link
          href="/dashboard/me"
          className="hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
          Edit account
        </Link>
      </div>
    </main>
  );
}
