'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useResetPassword } from '@/query/auth';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const { mutate: reset, isPending, isSuccess, error } = useResetPassword();

  const pwError = newPassword && newPassword.length < 8 ? 'Minimum 8 characters' : null;
  const confirmError = confirm && newPassword !== confirm ? 'Passwords do not match' : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || pwError || confirmError) return;
    reset({ token, newPassword });
  }

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => router.push('/auth/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border shadow-sm p-10 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Reset link is missing</h1>
          <p className="text-sm text-gray-500 mb-4">
            This page needs a reset token. Please use the link from your email.
          </p>
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Choose a new password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Pick something at least 8 characters long. You'll use it next time you sign in.
        </p>

        {isSuccess ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Password updated</p>
            <p className="text-xs text-gray-500">Taking you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {pwError && <p className="text-xs text-red-500 mt-1">{pwError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {confirmError && <p className="text-xs text-red-500 mt-1">{confirmError}</p>}
            </div>

            {error && (
              <p className="text-xs text-red-500">
                {(error as any)?.response?.data?.message ??
                  "We couldn't update your password. Try again."}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !newPassword || !!pwError || !!confirmError}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
