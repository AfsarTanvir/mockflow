import type { SchedulerStatus } from '@/types';

/**
 * Browser copy of the scheduler availability check, so revisiting a project
 * doesn't call the API again. It expires when the server's cached answer does
 * (`expiresIn`, at most 10 minutes), so the two never disagree for long.
 *
 * localStorage can be missing or throw (private mode, blocked storage): every
 * access is guarded and a failure just means "not cached".
 */

const KEY = 'mockflow-scheduler-status';
export const STATUS_TTL_MS = 10 * 60 * 1000;
// Floor for the server's remaining time, so a nearly-expired answer can't
// trigger a refetch on every mount.
const MIN_TTL_MS = 30 * 1000;

export type StoredSchedulerStatus = SchedulerStatus & { expiresAt: number };

export function readStoredStatus(): StoredSchedulerStatus | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSchedulerStatus;
    return typeof stored.expiresAt === 'number' && stored.expiresAt > Date.now() ? stored : null;
  } catch {
    return null;
  }
}

export function storeStatus(status: SchedulerStatus): StoredSchedulerStatus {
  const ttl = Math.min(STATUS_TTL_MS, Math.max(MIN_TTL_MS, status.expiresIn * 1000));
  const stored = { ...status, expiresAt: Date.now() + ttl };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable: the in-memory query cache still dedupes */
  }
  return stored;
}

export function clearStoredStatus(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Milliseconds until a stored status should be re-checked (0 = now). */
export function msUntilExpiry(status: StoredSchedulerStatus | undefined): number {
  return status ? Math.max(0, status.expiresAt - Date.now()) : 0;
}

export function unavailableMessage(status: SchedulerStatus | undefined): string {
  switch (status?.reason) {
    case 'not_configured':
      return 'Scheduling is not set up on this server (SCHEDULER_URL).';
    case 'unauthorized':
      return 'The scheduler rejected the API key. Ask an admin to check SCHEDULER_API_KEY.';
    case 'unreachable':
      return 'The scheduler is not reachable right now. Try again later.';
    default:
      return 'Checking whether the scheduler is available…';
  }
}
