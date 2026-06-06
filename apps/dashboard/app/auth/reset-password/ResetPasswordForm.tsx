'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { useResetPassword } from '@/query/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

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
      <div className="bg-muted flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="text-foreground mb-2 text-xl font-bold">Reset link is missing</h1>
          <p className="text-muted-foreground mb-4 text-sm">
            This page needs a reset token. Please use the link from your email.
          </p>
          <Link href="/auth/forgot-password" className="text-primary text-sm hover:underline">
            Request a new reset link
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-foreground text-xl font-bold">Choose a new password</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Pick something at least 8 characters long. You&apos;ll use it next time you sign in.
        </p>

        {isSuccess ? (
          <div className="text-center">
            <div className="bg-success/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <CircleCheck className="text-success size-6" />
            </div>
            <p className="text-foreground mb-1 text-sm font-medium">Password updated</p>
            <p className="text-muted-foreground text-xs">Taking you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={!!pwError}
                required
              />
              {pwError && <p className="text-destructive text-xs">{pwError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!confirmError}
                required
              />
              {confirmError && <p className="text-destructive text-xs">{confirmError}</p>}
            </div>

            {error && (
              <Alert variant="destructive">
                {(error as any)?.response?.data?.message ??
                  "We couldn't update your password. Try again."}
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !newPassword || !!pwError || !!confirmError}
            >
              {isPending ? 'Saving…' : 'Save new password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
