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

      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">My Profile</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium text-foreground">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Email verified</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                user.emailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}
            >
              {user.emailVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Member since</span>
            <span className="text-sm text-foreground">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
