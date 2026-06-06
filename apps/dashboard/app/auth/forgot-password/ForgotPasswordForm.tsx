'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { useForgotPassword } from '@/query/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

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
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-foreground text-xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Enter the email you signed up with. We&apos;ll send you a link to set a new password.
        </p>

        {isSuccess ? (
          <div className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <MailCheck className="text-primary size-6" />
            </div>
            <p className="text-foreground mb-1 text-sm font-medium">Check your email</p>
            <p className="text-muted-foreground text-sm">We&apos;ve sent a reset link to</p>
            <p className="text-foreground mb-3 text-sm font-medium">{submittedEmail}</p>
            <p className="text-muted-foreground text-xs">
              The link expires in 1 hour. Don&apos;t see it? Check your spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive" className="flex-col">
                <p>
                  {(error as any)?.response?.data?.message ??
                    "We couldn't send the reset link. Try again in a moment."}
                </p>
                {(error as any)?.response?.status === 404 && (
                  <p>
                    <Link href="/auth/register" className="font-medium underline">
                      Create an account
                    </Link>{' '}
                    instead.
                  </p>
                )}
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending || !email.trim()}>
              {isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Remembered your password?{' '}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
