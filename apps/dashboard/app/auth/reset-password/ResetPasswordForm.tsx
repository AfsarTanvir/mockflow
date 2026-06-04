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
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="bg-card rounded-2xl border shadow-sm p-10 w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Reset link is missing</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This page needs a reset token. Please use the link from your email.
          </p>
          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="bg-card rounded-2xl border shadow-sm p-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-foreground mb-2">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pick something at least 8 characters long. You'll use it next time you sign in.
        </p>

        {isSuccess ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-success"
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
            <p className="text-sm font-medium text-foreground mb-1">Password updated</p>
            <p className="text-xs text-muted-foreground">Taking you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {confirmError && <p className="text-xs text-destructive mt-1">{confirmError}</p>}
            </div>

            {error && (
              <p className="text-xs text-destructive">
                {(error as any)?.response?.data?.message ??
                  "We couldn't update your password. Try again."}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !newPassword || !!pwError || !!confirmError}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
