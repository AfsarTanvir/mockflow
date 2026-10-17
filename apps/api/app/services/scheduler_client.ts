import env from '#start/env';

/**
 * Thin HTTP client for the external local-scheduler (a Go service with a JSON
 * API: POST /jobs, GET /jobs/:id, …). Server-to-server only — the dashboard
 * never talks to the scheduler directly.
 *
 * Config is read on every call (not at import) so tests can point it at a fake
 * scheduler with `env.set('SCHEDULER_URL', …)`.
 *
 * Errors:
 *   - SchedulerUnavailableError — not configured, unreachable, timed out, 5xx,
 *     or the scheduler rejected our API key. Callers treat these as "scheduler
 *     down" and degrade.
 *   - SchedulerRequestError — any other 4xx (bad job spec, already running).
 * A 404 for a single job is NOT an error: those functions return null.
 */

const TIMEOUT_MS = 3000;

export type SchedulerUnavailableReason = 'not_configured' | 'unreachable' | 'unauthorized';

export class SchedulerUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: SchedulerUnavailableReason
  ) {
    super(message);
    this.name = 'SchedulerUnavailableError';
  }
}

export class SchedulerRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = 'SchedulerRequestError';
  }
}

export interface SchedulerRun {
  id?: number;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'success' | 'failed';
  output?: string;
  error?: string;
}

export interface SchedulerJob {
  id: string;
  name: string;
  schedule?: string;
  runAt?: string;
  enabled: boolean;
  running: boolean;
  nextRunAt?: string;
  lastRun?: SchedulerRun;
  createdAt: string;
  http?: { url: string; method?: string };
}

export interface HttpJobSpec {
  name: string;
  /** Cron or `@every 10m`. Exactly one of schedule / runAt. */
  schedule?: string;
  runAt?: string;
  type: 'http';
  http: { url: string; method: string; headers?: Record<string, string>; body?: string };
  timeoutSeconds?: number;
}

function baseUrl(): string | null {
  const url = env.get('SCHEDULER_URL');
  return url ? url.replace(/\/+$/, '') : null;
}

export function isConfigured(): boolean {
  return baseUrl() !== null;
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T | null; errorCode: string | null }> {
  const base = baseUrl();
  if (!base) {
    throw new SchedulerUnavailableError('SCHEDULER_URL is not set', 'not_configured');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = env.get('SCHEDULER_API_KEY');
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  let text: string;
  try {
    res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await res.text();
  } catch (err) {
    throw new SchedulerUnavailableError(
      `Scheduler unreachable: ${(err as Error).message}`,
      'unreachable'
    );
  }

  if (res.status === 401) {
    throw new SchedulerUnavailableError('Scheduler rejected the API key', 'unauthorized');
  }
  if (res.status >= 500) {
    throw new SchedulerUnavailableError(`Scheduler answered ${res.status}`, 'unreachable');
  }

  // Every scheduler answer is JSON; anything else means something else is
  // listening on SCHEDULER_URL.
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new SchedulerUnavailableError('Scheduler answered with non-JSON', 'unreachable');
    }
  }

  if (res.status >= 400) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    return { status: res.status, data: null, errorCode: error?.code ?? 'unknown' };
  }
  return { status: res.status, data: data as T, errorCode: null };
}

/** Throw for any 4xx except the ones the caller handles itself. */
function expectOk<T>(
  result: { status: number; data: T | null; errorCode: string | null },
  allow404 = false
): T | null {
  if (result.errorCode === null) return result.data;
  if (allow404 && result.status === 404) return null;
  throw new SchedulerRequestError(
    `Scheduler rejected the request (${result.errorCode})`,
    result.status,
    result.errorCode
  );
}

const jobPath = (id: string) => `/jobs/${encodeURIComponent(id)}`;

/**
 * Can we use the jobs API right now? Asks for a job id that can't exist: a
 * reachable scheduler that accepts our key answers 404 `not_found`. This hits an
 * authenticated route on purpose, so a wrong API key reads as "unavailable"
 * here rather than surfacing later as a failed create.
 */
export async function probe(): Promise<SchedulerUnavailableReason | null> {
  try {
    const result = await call('GET', jobPath('mockflow-availability-probe'));
    if (result.errorCode === null || result.errorCode === 'not_found') return null;
    return 'unreachable';
  } catch (err) {
    if (err instanceof SchedulerUnavailableError) return err.reason;
    throw err;
  }
}

export async function createJob(spec: HttpJobSpec): Promise<SchedulerJob> {
  return expectOk(await call<SchedulerJob>('POST', '/jobs', spec))!;
}

export async function listJobs(): Promise<SchedulerJob[]> {
  return expectOk(await call<SchedulerJob[]>('GET', '/jobs')) ?? [];
}

/** The job, or null if the scheduler doesn't know it. */
export async function getJob(id: string): Promise<SchedulerJob | null> {
  return expectOk(await call<SchedulerJob>('GET', jobPath(id)), true);
}

/** Newest first. Null if the scheduler doesn't know the job. */
export async function listRuns(id: string, limit = 20): Promise<SchedulerRun[] | null> {
  return expectOk(await call<SchedulerRun[]>('GET', `${jobPath(id)}/runs?limit=${limit}`), true);
}

/** Idempotent: deleting a job the scheduler doesn't know is fine. */
export async function deleteJob(id: string): Promise<void> {
  expectOk(await call('DELETE', jobPath(id)), true);
}

export async function pauseJob(id: string): Promise<SchedulerJob | null> {
  return expectOk(await call<SchedulerJob>('POST', `${jobPath(id)}/pause`), true);
}

export async function resumeJob(id: string): Promise<SchedulerJob | null> {
  return expectOk(await call<SchedulerJob>('POST', `${jobPath(id)}/resume`), true);
}

/** Start a run now (in the background). 409 `already_running` → SchedulerRequestError. */
export async function runJob(id: string): Promise<SchedulerJob | null> {
  return expectOk(await call<SchedulerJob>('POST', `${jobPath(id)}/run`), true);
}
