'use client';

import Link from 'next/link';
import { useUser, useSignOut } from '@/query/auth';
import type { User } from '@/types';

export default function DashboardClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });
  const { mutate: signOut, isPending } = useSignOut();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">MockFlow</h1>
        <button
          onClick={() => signOut()}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      <main className="max-w-2xl mx-auto mt-10 px-4 space-y-6">
        <div className="bg-white rounded-xl shadow p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Projects</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create and manage your mock APIs</p>
          </div>
          <Link
            href="/dashboard/projects"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View Projects
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-500">Email verified</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.emailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
              >
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Member since</span>
              <span className="text-sm text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
