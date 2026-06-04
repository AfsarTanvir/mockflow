'use client';

import { useRouter } from 'next/navigation';
import { useAcceptInvite } from '@/query/teams';

type InviteInfo = {
  email: string;
  role: string;
  project: { id: string; name: string; slug: string };
};

export default function AcceptInviteClient({
  token,
  invite,
  sessionUser,
}: {
  token: string;
  invite: InviteInfo;
  sessionUser: { id: string; email: string; name: string };
}) {
  const router = useRouter();
  const { mutate: acceptInvite, isPending, error } = useAcceptInvite();

  const emailMismatch = sessionUser.email !== invite.email;

  function handleAccept() {
    acceptInvite(token, {
      onSuccess: ({ projectId }) => {
        router.push(`/dashboard/projects/${projectId}`);
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-8 w-full max-w-md">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
          <span className="text-primary font-bold text-lg">
            {invite.project.name[0].toUpperCase()}
          </span>
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-1">You&apos;ve been invited</h1>
        <p className="text-sm text-gray-500 mb-6">
          Join <span className="font-medium text-gray-800">{invite.project.name}</span> as{' '}
          <span className="font-medium text-gray-800 capitalize">{invite.role}</span>
        </p>

        {emailMismatch && (
          <div className="mb-5 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            This invite was sent to <strong>{invite.email}</strong> but you&apos;re signed in as{' '}
            <strong>{sessionUser.email}</strong>. Please sign in with the correct account.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error.message}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isPending || emailMismatch}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Accepting…' : 'Accept Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
