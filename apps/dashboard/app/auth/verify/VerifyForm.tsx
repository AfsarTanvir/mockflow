'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { useVerifyEmail } from '@/query/auth';
import { Card } from '@/components/ui/card';

export default function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const { mutate: verify, isPending, isSuccess, isError, error } = useVerifyEmail();

  useEffect(() => {
    if (token) verify(token);
  }, [token]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => router.push('/auth/login'), 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        {isPending && (
          <>
            <Loader2 className="text-muted-foreground mx-auto mb-4 size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Verifying your email…</p>
          </>
        )}

        {isSuccess && (
          <>
            <div className="bg-success/10 mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full">
              <CircleCheck className="text-success size-6" />
            </div>
            <h1 className="text-foreground mb-2 text-xl font-bold">Email verified!</h1>
            <p className="text-muted-foreground text-sm">Redirecting you to login…</p>
          </>
        )}

        {isError && (
          <>
            <div className="bg-destructive/10 mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full">
              <CircleX className="text-destructive size-6" />
            </div>
            <h1 className="text-foreground mb-2 text-xl font-bold">Link invalid or expired</h1>
            <p className="text-muted-foreground mb-6 text-sm">
              {(error as any)?.response?.data?.message ??
                'This verification link is no longer valid.'}
            </p>
            <Link href="/auth/login" className="text-primary text-sm hover:underline">
              Back to login
            </Link>
          </>
        )}

        {!token && (
          <>
            <h1 className="text-foreground mb-2 text-xl font-bold">Missing token</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              No verification token found in the URL.
            </p>
            <Link href="/auth/login" className="text-primary text-sm hover:underline">
              Back to login
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
