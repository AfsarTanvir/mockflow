'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useVerifyEmail } from '@/query/auth';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-10 w-full max-w-md text-center">
        {isPending && (
          <>
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Verifying your email…</p>
          </>
        )}

        {isSuccess && (
          <>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500">Redirecting you to login…</p>
          </>
        )}

        {isError && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link invalid or expired</h1>
            <p className="text-sm text-gray-500 mb-6">
              {(error as any)?.response?.data?.message ?? 'This verification link is no longer valid.'}
            </p>
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              Back to login
            </Link>
          </>
        )}

        {!token && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Missing token</h1>
            <p className="text-sm text-gray-500 mb-4">No verification token found in the URL.</p>
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
