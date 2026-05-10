'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useResendVerification } from '@/query/auth';

export default function VerifyPendingForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your email';

  const { mutate: resend, isPending, isSuccess, error } = useResendVerification();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-10 w-full max-w-md text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
        <p className="text-sm font-medium text-gray-900 mb-6">{email}</p>
        <p className="text-xs text-gray-400 mb-8">The link expires in 10 minutes.</p>

        {isSuccess ? (
          <p className="text-sm text-green-600 mb-6">Verification email resent.</p>
        ) : (
          <>
            {error && (
              <p className="text-xs text-red-500 mb-4">
                {(error as any)?.response?.data?.message ?? 'Failed to resend'}
              </p>
            )}
            <button
              onClick={() => resend()}
              disabled={isPending}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50 mb-6 block mx-auto"
            >
              {isPending ? 'Sending…' : "Didn't receive it? Resend"}
            </button>
          </>
        )}

        <Link href="/auth/login" className="text-xs text-gray-400 hover:text-gray-600">
          Back to login
        </Link>
      </div>
    </div>
  );
}
