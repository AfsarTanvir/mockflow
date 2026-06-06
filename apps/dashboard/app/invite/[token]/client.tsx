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
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl border shadow-sm p-8 w-full max-w-md">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
          <span className="text-primary font-bold text-lg">
            {invite.project.name[0].toUpperCase()}
          </span>
        </div>

        <h1 className="text-lg font-semibold text-foreground mb-1">You&apos;ve been invited</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Join <span className="font-medium text-foreground">{invite.project.name}</span> as{' '}
          <span className="font-medium text-foreground capitalize">{invite.role}</span>
        </p>

        {emailMismatch && (
          <div className="mb-5 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            This invite was sent to <strong>{invite.email}</strong> but you&apos;re signed in as{' '}
            <strong>{sessionUser.email}</strong>. Please sign in with the correct account.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isPending || emailMismatch}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Accepting…' : 'Accept Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
