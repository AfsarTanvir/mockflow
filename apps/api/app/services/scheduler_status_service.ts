import * as cache from '#services/cache_service';
import { cacheKeys } from '#services/cache_keys';
import * as SchedulerClient from '#services/scheduler_client';
import type { SchedulerUnavailableReason } from '#services/scheduler_client';

/**
 * Is the local-scheduler usable? The dashboard asks this before offering the
 * "Schedule" option, so the answer is cached in Redis for exactly
 * STATUS_TTL_SECONDS (both "available" and "unavailable"): at most one probe per
 * 10 minutes across all users and API instances.
 *
 * Freshness is judged by `checkedAt`, not the Redis TTL (which the cache service
 * jitters ±10%), so "10 minutes" is exact. `expiresIn` tells the browser how long
 * the answer has left, so its own copy expires together with this one.
 *
 * Without Redis every call probes — the cache is never needed for correctness.
 */

export const STATUS_TTL_SECONDS = 600;

export interface SchedulerStatus {
  available: boolean;
  reason: SchedulerUnavailableReason | null;
  checkedAt: string;
}

export interface SchedulerStatusResponse extends SchedulerStatus {
  /** Seconds until this answer should be re-checked. */
  expiresIn: number;
}

function ageSeconds(status: SchedulerStatus): number {
  return (Date.now() - Date.parse(status.checkedAt)) / 1000;
}

function withExpiry(status: SchedulerStatus): SchedulerStatusResponse {
  const expiresIn = Math.max(0, Math.round(STATUS_TTL_SECONDS - ageSeconds(status)));
  return { ...status, expiresIn };
}

function make(reason: SchedulerUnavailableReason | null): SchedulerStatus {
  return { available: reason === null, reason, checkedAt: new Date().toISOString() };
}

async function store(status: SchedulerStatus): Promise<SchedulerStatus> {
  await cache.set(cacheKeys.schedulerStatus(), status, STATUS_TTL_SECONDS);
  return status;
}

// Concurrent misses and rechecks in this process share one probe.
let inflight: Promise<SchedulerStatus> | null = null;

function probeAndStore(): Promise<SchedulerStatus> {
  inflight ??= SchedulerClient.probe()
    .then((reason) => store(make(reason)))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The status, and whether answering it took a fresh probe (cache miss). */
export async function checkStatus(): Promise<{
  status: SchedulerStatusResponse;
  probed: boolean;
}> {
  // Config can't change at runtime: no probe, nothing worth caching.
  if (!SchedulerClient.isConfigured()) {
    return { status: withExpiry(make('not_configured')), probed: false };
  }

  const cached = await cache.get<SchedulerStatus>(cacheKeys.schedulerStatus());
  if (cached && ageSeconds(cached) < STATUS_TTL_SECONDS) {
    return { status: withExpiry(cached), probed: false };
  }
  return { status: withExpiry(await probeAndStore()), probed: true };
}

export async function getStatus(): Promise<SchedulerStatusResponse> {
  return (await checkStatus()).status;
}

/**
 * A real scheduler call just failed. Probe again now and store that answer for
 * the next 10 minutes, instead of trusting the single failure: a blip (restart,
 * one dropped connection) leaves scheduling on, while a real outage turns it off
 * for everyone now rather than at the next regular probe.
 */
export async function recheck(): Promise<void> {
  if (!SchedulerClient.isConfigured()) return;
  await probeAndStore();
}
