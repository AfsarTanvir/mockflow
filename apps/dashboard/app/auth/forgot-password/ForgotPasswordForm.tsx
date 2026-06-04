'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForgotPassword } from '@/query/auth';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { mutate: forgot, isPending, isSuccess, error } = useForgotPassword();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmittedEmail(trimmed);
    forgot(trimmed);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="bg-card rounded-2xl border shadow-sm p-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-foreground mb-2">Reset your password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the email you signed up with. We'll send you a link to set a new password.
        </p>

        {isSuccess ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Check your email</p>
            <p className="text-sm text-muted-foreground mb-1">We've sent a reset link to</p>
            <p className="text-sm font-medium text-foreground mb-3">{submittedEmail}</p>
            <p className="text-xs text-muted-foreground">
              The link expires in 1 hour. Don't see it? Check your spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive">
                <p>
                  {(error as any)?.response?.data?.message ??
                    "We couldn't send the reset link. Try again in a moment."}
                </p>
                {(error as any)?.response?.status === 404 && (
                  <p className="mt-1">
                    <Link href="/auth/register" className="font-medium text-destructive underline">
                      Create an account
                    </Link>{' '}
                    instead.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
