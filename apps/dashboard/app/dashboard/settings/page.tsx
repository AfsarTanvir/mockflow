import { redirect } from 'next/navigation';

/** Account settings moved to /dashboard/me. Keep this path working for old links. */
export default function SettingsRedirect() {
  redirect('/dashboard/me');
}
