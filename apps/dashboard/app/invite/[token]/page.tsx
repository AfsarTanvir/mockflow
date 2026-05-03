import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AcceptInviteClient from './client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

type InviteInfo = {
  email: string;
  role: string;
  project: { id: string; name: string; slug: string };
};

async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  try {
    const res = await fetch(`${API_URL}/api/invites/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getSessionUser(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, sessionUser] = await Promise.all([getInviteInfo(token), getSessionUser()]);

  if (!invite) {
    redirect('/dashboard');
  }

  if (!sessionUser) {
    redirect(`/auth/login?next=/invite/${token}`);
  }

  return <AcceptInviteClient token={token} invite={invite} sessionUser={sessionUser} />;
}
