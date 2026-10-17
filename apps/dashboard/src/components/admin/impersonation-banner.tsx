'use client';

import { useSyncExternalStore } from 'react';
import { Eye, X } from 'lucide-react';

import { getImpersonatedName, stopImpersonation } from '@/lib/impersonation';

/**
 * Persistent banner shown while an admin is impersonating another user. Mounted
 * in the dashboard layout; renders nothing unless an impersonation session is
 * active. Exiting restores the admin token and returns to the admin console.
 */
// The cookie only changes with a full page load (start/stop impersonation).
const noSubscription = () => () => {};

export function ImpersonationBanner() {
  // null on the server and during hydration, so the markup always matches.
  const name = useSyncExternalStore(noSubscription, getImpersonatedName, () => null);

  if (!name) return null;

  function handleExit() {
    stopImpersonation();
    // A full load resets every client cache built with the impersonated token;
    // replace() keeps Back from returning to that user's pages.
    window.location.replace('/admin/users');
  }

  return (
    <div className="bg-warning/15 text-warning-foreground flex items-center justify-center gap-3 border-b border-warning/30 px-4 py-2 text-sm">
      <Eye className="text-warning size-4 shrink-0" />
      <span className="text-foreground">
        Viewing as <span className="font-semibold">{name}</span>
      </span>
      <button
        onClick={handleExit}
        className="text-warning hover:text-warning/80 inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
      >
        <X className="size-3.5" />
        Exit
      </button>
    </div>
  );
}
