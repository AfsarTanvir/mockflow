'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useResendVerification } from '@/query/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function VerifyPendingForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your email';

  const { mutate: resend, isPending, isSuccess, error } = useResendVerification();

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center sm:p-8">
        <div className="bg-primary/10 mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full">
          <Mail className="text-primary size-6" />
        </div>

        <h1 className="text-foreground mb-2 text-xl font-bold">Check your email</h1>
        <p className="text-muted-foreground text-sm">We sent a verification link to</p>
        <p className="text-foreground mb-6 text-sm font-medium">{email}</p>
        <p className="text-muted-foreground mb-8 text-xs">The link expires in 10 minutes.</p>

        {isSuccess ? (
          <p className="text-success mb-6 text-sm">Verification email resent.</p>
        ) : (
          <>
            {error && (
              <p className="text-destructive mb-4 text-xs">
                {(error as any)?.response?.data?.message ?? 'Failed to resend'}
              </p>
            )}
            <Button
              variant="link"
              onClick={() => resend()}
              disabled={isPending}
              className="mx-auto mb-6"
            >
              {isPending ? 'Sending…' : "Didn't receive it? Resend"}
            </Button>
          </>
        )}

        <div>
          <Link href="/auth/login" className="text-muted-foreground text-xs hover:underline">
            Back to login
          </Link>
        </div>
      </Card>
    </div>
  );
}
