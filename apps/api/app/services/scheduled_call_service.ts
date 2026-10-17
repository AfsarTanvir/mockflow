import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Exception } from '@adonisjs/core/exceptions';
import logger from '@adonisjs/core/services/logger';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { DateTime } from 'luxon';
import { match } from 'path-to-regexp';
import env from '#start/env';
import ScheduledCall from '#models/scheduled_call';
import type Endpoint from '#models/endpoint';
import * as AccessService from '#services/access_service';
import { compareSpecificity } from '#services/mock_blueprint';
import * as SchedulerClient from '#services/scheduler_client';
import * as SchedulerStatus from '#services/scheduler_status_service';
import type { SchedulerJob, SchedulerRun } from '#services/scheduler_client';
import * as EndpointQueries from '#queries/endpoint_queries';
import * as ScheduledCallQueries from '#queries/scheduled_call_queries';

/**
 * Scheduled calls: ask the external local-scheduler to call one of the project's
 * own mock endpoints once (`runAt`) or every N seconds. MockFlow keeps the row
 * (authorization, project link); the scheduler keeps the live state (next run,
 * run history), which is fetched on demand.
 *
 * Only the project's mock URL is ever targeted (never a user-supplied host), so
 * the scheduler can't be used to reach other machines.
 *
 * Private projects: every job sends a per-schedule secret in SCHEDULE_TOKEN_HEADER.
 * The mock route accepts it for that project only (see mock_service), and treats
 * an unknown secret as a deleted schedule whose job is still firing.
 */

/** What createScheduledCallValidator produces (its optional fields may be omitted). */
export interface CreateScheduledCallInput {
  endpointId: string;
  path: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  mode: 'once' | 'repeat';
  runAt?: string;
  intervalSeconds?: number;
}

export const SCHEDULE_TOKEN_HEADER = 'X-MockFlow-Schedule';
export const MAX_SCHEDULES_PER_PROJECT = 20;
export const MIN_INTERVAL_SECONDS = 60;
export const MAX_INTERVAL_SECONDS = 30 * 24 * 60 * 60;
const MAX_RUN_AT_DAYS_AHEAD = 365;
const MAX_HEADERS = 20;
const JOB_TIMEOUT_SECONDS = 30;
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);
// Headers the caller may not set: our own secret, and ones the HTTP client owns.
const RESERVED_HEADERS = new Set([
  SCHEDULE_TOKEN_HEADER.toLowerCase(),
  'host',
  'content-length',
  'connection',
  'transfer-encoding',
]);
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ----------------------------------------------------------------- */
/* Pure helpers (unit-tested)                                        */
/* ----------------------------------------------------------------- */

/** Seconds → a scheduler `@every` spec in the largest whole unit: 600 → `@every 10m`. */
export function intervalToSchedule(seconds: number): string {
  if (seconds % 3600 === 0) return `@every ${seconds / 3600}h`;
  if (seconds % 60 === 0) return `@every ${seconds / 60}m`;
  return `@every ${seconds}s`;
}

/**
 * Scheduler job names are namespaced by database, so a reconcile run only ever
 * touches jobs created by this MockFlow database even if several share one scheduler.
 */
function jobNamePrefix(): string {
  return `mockflow:${env.get('DB_DATABASE')}:`;
}

export function jobName(scheduledCallId: string): string {
  return jobNamePrefix() + scheduledCallId;
}

/** The scheduled-call id in one of our job names, or null for anyone else's job. */
export function parseJobName(name: string): string | null {
  const prefix = jobNamePrefix();
  if (!name.startsWith(prefix)) return null;
  const id = name.slice(prefix.length);
  return UUID.test(id) ? id : null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Does a concrete request path (query string allowed) hit this endpoint path pattern? */
export function requestPathMatches(endpointPath: string, requestPath: string): boolean {
  const pathname = requestPath.split('?')[0]!;
  try {
    return match(endpointPath, { decode: decodeURIComponent })(pathname) !== false;
  } catch {
    // Malformed %-escapes, or an endpoint pattern path-to-regexp can't compile.
    return false;
  }
}

/**
 * Does the path contain a `.` or `..` segment (also %-encoded)? Those could step
 * the scheduler's request out of `/mock/{slug}/`, so they're never allowed.
 */
export function hasDotSegment(requestPath: string): boolean {
  return requestPath
    .split('?')[0]!
    .split('/')
    .some((segment) => {
      try {
        segment = decodeURIComponent(segment);
      } catch {
        /* judged as written */
      }
      return segment === '.' || segment === '..';
    });
}

/** First problem with user-supplied request headers, or null. */
export function headersError(headers: Record<string, string>): string | null {
  const names = Object.keys(headers);
  if (names.length > MAX_HEADERS) return `At most ${MAX_HEADERS} headers are allowed`;
  for (const name of names) {
    if (!HEADER_NAME.test(name)) return `"${name}" is not a valid header name`;
    if (RESERVED_HEADERS.has(name.toLowerCase())) return `The "${name}" header can't be set`;
    if (hasControlChar(headers[name]!)) {
      return `The "${name}" header value contains a control character`;
    }
  }
  return null;
}

/** Tab is fine; any other control character makes the scheduler's HTTP client refuse to send. */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code < 0x20 && code !== 0x09) || code === 0x7f) return true;
  }
  return false;
}

/**
 * The endpoint that serves a request, in the mock engine's order: active
 * endpoints, most specific first. Falls back to a matching inactive endpoint, so a
 * call on a switched-off endpoint keeps its place (its runs 404 until it's back on).
 */
function servingEndpoint(method: string, path: string, endpoints: Endpoint[]): Endpoint | null {
  const matching = endpoints
    .filter((e) => e.method === method && requestPathMatches(e.path, path))
    .sort((a, b) => compareSpecificity(a.path, b.path));
  return matching.find((e) => e.isActive) ?? matching[0] ?? null;
}

/* ----------------------------------------------------------------- */
/* Views                                                             */
/* ----------------------------------------------------------------- */

export interface ScheduledCallView {
  id: string;
  projectId: string;
  endpointId: string | null;
  method: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  mode: 'once' | 'repeat';
  runAt: string | null;
  intervalSeconds: number | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  /** False when another endpoint now serves the call (its endpoint was edited, or a more specific one added). */
  matchesEndpoint: boolean;
  /** Live state from the scheduler; null when it couldn't be fetched or the job is gone. */
  live: {
    enabled: boolean;
    running: boolean;
    nextRunAt: string | null;
    lastRun: SchedulerRun | null;
  } | null;
  /** ok = live state fetched · missing = the scheduler lost the job · unknown = scheduler down. */
  sync: 'ok' | 'missing' | 'unknown';
}

/**
 * `endpoints` = the project's endpoints. `job` undefined = not fetched (scheduler
 * down); null = the scheduler doesn't know it.
 */
function toView(
  call: ScheduledCall,
  endpoints: Endpoint[],
  job: SchedulerJob | null | undefined
): ScheduledCallView {
  return {
    id: call.id,
    projectId: call.projectId,
    endpointId: call.endpointId,
    method: call.method,
    path: call.path,
    requestHeaders: call.requestHeaders,
    requestBody: call.requestBody,
    mode: call.mode,
    runAt: call.runAt?.toISO() ?? null,
    intervalSeconds: call.intervalSeconds,
    isActive: call.isActive,
    createdBy: call.createdBy,
    createdAt: call.createdAt.toISO()!,
    matchesEndpoint:
      !!call.endpointId &&
      servingEndpoint(call.method, call.path, endpoints)?.id === call.endpointId,
    live: job
      ? {
          enabled: job.enabled,
          running: job.running,
          nextRunAt: job.nextRunAt ?? null,
          lastRun: job.lastRun ?? null,
        }
      : null,
    sync: job === undefined ? 'unknown' : job === null ? 'missing' : 'ok',
  };
}

/* ----------------------------------------------------------------- */
/* Scheduler error mapping                                           */
/* ----------------------------------------------------------------- */

const unavailable = () =>
  new Exception('The scheduler is not available right now. Try again later.', {
    status: 503,
    code: 'E_SCHEDULER_UNAVAILABLE',
  });

const lost = () =>
  new Exception('The scheduler no longer has this call. Delete it and schedule it again.', {
    status: 409,
    code: 'E_SCHEDULE_LOST',
  });

/** Run a scheduler request, mapping its failures to HTTP errors. */
async function withScheduler<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof SchedulerClient.SchedulerUnavailableError) {
      await SchedulerStatus.recheck();
      throw unavailable();
    }
    if (err instanceof SchedulerClient.SchedulerRequestError) {
      if (err.code === 'already_running') {
        throw new Exception('This call is already running', {
          status: 409,
          code: 'E_ALREADY_RUNNING',
        });
      }
      throw new Exception(`The scheduler rejected the request (${err.code})`, {
        status: 502,
        code: 'E_SCHEDULER_REJECTED',
      });
    }
    throw err;
  }
}

/** Delete scheduler jobs, best effort. Leftovers are removed when they next fire. */
export async function dropJobs(jobIds: string[]): Promise<void> {
  const results = await Promise.allSettled(jobIds.map((id) => SchedulerClient.deleteJob(id)));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.warn(
      { err: (failed[0] as PromiseRejectedResult).reason },
      `[scheduler] could not delete ${failed.length} job(s); they are removed when they next fire`
    );
  }
}

/** Fire-and-forget {@link dropJobs}, for deletes that shouldn't wait on the scheduler. */
export function dropJobsInBackground(jobIds: string[]): void {
  if (jobIds.length > 0) void dropJobs(jobIds);
}

/* ----------------------------------------------------------------- */
/* Use cases                                                         */
/* ----------------------------------------------------------------- */

async function assertCallAccess(
  id: string,
  userId: string,
  minRole: AccessService.ProjectRole
): Promise<ScheduledCall> {
  const call = await ScheduledCallQueries.findById(id);
  if (!call) {
    throw new Exception('Scheduled call not found', {
      status: 404,
      code: 'E_SCHEDULED_CALL_NOT_FOUND',
    });
  }
  await AccessService.assertProjectAccess(call.projectId, userId, minRole);
  return call;
}

function projectEndpoints(call: ScheduledCall): Promise<Endpoint[]> {
  return EndpointQueries.listForProject(call.projectId);
}

/**
 * A project's scheduled calls with their live scheduler state. Viewer+.
 * Never fails because the scheduler is down: rows come back with `sync: 'unknown'`.
 */
export async function listForProject(
  projectId: string,
  userId: string
): Promise<ScheduledCallView[]> {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');
  const [calls, endpoints] = await Promise.all([
    ScheduledCallQueries.listForProject(projectId),
    EndpointQueries.listForProject(projectId),
  ]);

  let jobs: (SchedulerJob | null)[] | undefined;
  if (calls.length > 0) {
    try {
      jobs = await Promise.all(calls.map((c) => SchedulerClient.getJob(c.schedulerJobId)));
    } catch (err) {
      if (err instanceof SchedulerClient.SchedulerUnavailableError) {
        // Don't hold the list up (it is polled); the recheck updates the status for next time.
        void SchedulerStatus.recheck().catch(() => {});
      } else {
        logger.warn({ err }, '[scheduler] could not load live state');
      }
    }
  }

  return calls.map((call, i) => toView(call, endpoints, jobs?.[i]));
}

/** Schedule a call to one of the project's endpoints. Member+. */
export async function createScheduledCall(
  projectId: string,
  userId: string,
  input: CreateScheduledCallInput
): Promise<ScheduledCallView> {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'member');

  const endpoint = await EndpointQueries.findById(input.endpointId);
  if (!endpoint || endpoint.projectId !== project.id) {
    throw new Exception('Endpoint not found', { status: 404, code: 'E_ENDPOINT_NOT_FOUND' });
  }

  const invalid = (message: string) =>
    new Exception(message, { status: 422, code: 'E_SCHEDULE_INVALID' });

  if (hasDotSegment(input.path)) {
    throw invalid('The path can\'t contain "." or ".." segments');
  }
  if (!requestPathMatches(endpoint.path, input.path)) {
    throw invalid(`The path must match ${endpoint.path}, with any :params filled in`);
  }
  // Another endpoint may serve this path first (e.g. /users/me before /users/:id);
  // the call belongs with the endpoint that actually answers it.
  const endpoints = await EndpointQueries.listForProject(project.id);
  const served = servingEndpoint(endpoint.method, input.path, endpoints);
  if (served && served.id !== endpoint.id) {
    throw invalid(
      `${served.method} ${served.path} answers this path; schedule it from that endpoint`
    );
  }

  let runAt: DateTime | null = null;
  let intervalSeconds: number | null = null;
  if (input.mode === 'once') {
    // An explicit offset is required: without one the server's own zone would be guessed.
    if (!input.runAt || !/(?:z|[+-]\d{2}(?::?\d{2})?)$/i.test(input.runAt)) {
      throw invalid(
        'runAt must be an ISO 8601 date and time with a time zone, e.g. 2026-10-12T09:00:00Z'
      );
    }
    runAt = DateTime.fromISO(input.runAt, { setZone: true });
    if (!runAt.isValid) throw invalid('runAt must be an ISO 8601 date and time');
    if (runAt <= DateTime.now().plus({ seconds: 10 })) throw invalid('runAt must be in the future');
    if (runAt > DateTime.now().plus({ days: MAX_RUN_AT_DAYS_AHEAD })) {
      throw invalid(`runAt must be within ${MAX_RUN_AT_DAYS_AHEAD} days`);
    }
  } else {
    if (input.intervalSeconds === undefined) throw invalid('intervalSeconds is required');
    intervalSeconds = input.intervalSeconds;
  }

  const headers = input.requestHeaders ?? {};
  const headerProblem = headersError(headers);
  if (headerProblem) throw invalid(headerProblem);

  const body = input.requestBody ? input.requestBody : null;
  if (body !== null && METHODS_WITHOUT_BODY.has(endpoint.method)) {
    throw invalid(`A ${endpoint.method} request can't have a body`);
  }

  // Soft cap (a concurrent create can pass it by one): it bounds load, not an invariant.
  if ((await ScheduledCallQueries.countForProject(project.id)) >= MAX_SCHEDULES_PER_PROJECT) {
    throw new Exception(`A project can have at most ${MAX_SCHEDULES_PER_PROJECT} scheduled calls`, {
      status: 409,
      code: 'E_SCHEDULE_LIMIT',
    });
  }

  const id = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const sendHeaders: Record<string, string> = { ...headers, [SCHEDULE_TOKEN_HEADER]: token };
  if (body !== null && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
    sendHeaders['Content-Type'] = 'application/json';
  }

  const target = (
    env.get('SCHEDULER_TARGET_URL') ?? env.get('API_URL', 'http://localhost:3333')
  ).replace(/\/+$/, '');

  // Job first, row second: if the insert fails we delete the job; if the response
  // is lost after the job was created, the job is an orphan and is cleaned up
  // the first time it fires (its token is unknown).
  const job = await withScheduler(() =>
    SchedulerClient.createJob({
      name: jobName(id),
      ...(runAt
        ? { runAt: runAt.toUTC().toISO()! }
        : { schedule: intervalToSchedule(intervalSeconds!) }),
      type: 'http',
      http: {
        url: `${target}/mock/${project.slug}${input.path}`,
        method: endpoint.method,
        headers: sendHeaders,
        ...(body !== null && { body }),
      },
      timeoutSeconds: JOB_TIMEOUT_SECONDS,
    })
  );

  let call: ScheduledCall;
  try {
    call = await ScheduledCall.create({
      id,
      projectId: project.id,
      endpointId: endpoint.id,
      createdBy: userId,
      method: endpoint.method,
      path: input.path,
      requestHeaders: headers,
      requestBody: body,
      mode: input.mode,
      runAt,
      intervalSeconds,
      isActive: true,
      schedulerJobId: job.id,
      tokenHash: hashToken(token),
    });
  } catch (err) {
    dropJobsInBackground([job.id]);
    throw err;
  }
  return toView(call, endpoints, job);
}

/**
 * Delete a scheduled call. Member+. Works even when the scheduler is down: the
 * row goes now, and the job is removed the first time it fires afterwards.
 */
export async function deleteScheduledCall(id: string, userId: string): Promise<void> {
  const call = await assertCallAccess(id, userId, 'member');
  await call.delete();
  await dropJobs([call.schedulerJobId]);
}

/** Pause or resume. Member+. */
export async function setScheduledCallActive(
  id: string,
  userId: string,
  active: boolean
): Promise<ScheduledCallView> {
  const call = await assertCallAccess(id, userId, 'member');
  // The scheduler runs a resumed one-time job at once if its time has passed;
  // that would be a surprise call, so ask for an explicit "Run now" instead.
  if (active && call.mode === 'once' && call.runAt && call.runAt <= DateTime.now()) {
    throw new Exception(
      "This call's time has passed. Use Run now, or delete it and schedule a new time.",
      { status: 409, code: 'E_SCHEDULE_EXPIRED' }
    );
  }
  const job = await withScheduler(() =>
    active
      ? SchedulerClient.resumeJob(call.schedulerJobId)
      : SchedulerClient.pauseJob(call.schedulerJobId)
  );
  if (!job) throw lost();
  call.isActive = active;
  await call.save();
  return toView(call, await projectEndpoints(call), job);
}

/** Send the call now, outside its schedule. Member+. The run happens in the background. */
export async function runScheduledCallNow(id: string, userId: string): Promise<ScheduledCallView> {
  const call = await assertCallAccess(id, userId, 'member');
  const job = await withScheduler(() => SchedulerClient.runJob(call.schedulerJobId));
  if (!job) throw lost();
  return toView(call, await projectEndpoints(call), job);
}

/** Run history from the scheduler, newest first. Viewer+. */
export async function listRuns(id: string, userId: string): Promise<SchedulerRun[]> {
  const call = await assertCallAccess(id, userId, 'viewer');
  const runs = await withScheduler(() => SchedulerClient.listRuns(call.schedulerJobId, 20));
  if (!runs) throw lost();
  return runs;
}

/* ----------------------------------------------------------------- */
/* Hooks used by other services                                      */
/* ----------------------------------------------------------------- */

/** The project a schedule secret grants mock access to, or null if no schedule has it. */
export async function projectForToken(token: string): Promise<string | null> {
  if (token.length > 256) return null;
  const call = await ScheduledCallQueries.findByTokenHash(hashToken(token));
  return call?.projectId ?? null;
}

/**
 * Version restore deletes and re-creates every endpoint, which nulls each
 * scheduled call's endpoint link. Re-link each call to the restored endpoint that
 * would serve it; delete the calls nothing serves any more (as if their endpoint
 * had been deleted). Runs inside the restore's transaction; returns the scheduler
 * job ids to drop once it commits.
 */
export async function relinkAfterRestore(
  projectId: string,
  trx: TransactionClientContract
): Promise<string[]> {
  const calls = await ScheduledCallQueries.listForProject(projectId, trx);
  if (calls.length === 0) return [];
  const endpoints = await EndpointQueries.listForProject(projectId, trx);

  const gone: string[] = [];
  for (const call of calls) {
    const endpoint = servingEndpoint(call.method, call.path, endpoints);
    if (!endpoint) {
      gone.push(call.id);
      continue;
    }
    call.useTransaction(trx);
    call.endpointId = endpoint.id;
    await call.save();
  }
  return ScheduledCallQueries.deleteByIds(gone, trx);
}

/** Delete an endpoint's scheduled calls inside the caller's transaction; returns their job ids. */
export function deleteForEndpoint(
  endpointId: string,
  trx: TransactionClientContract
): Promise<string[]> {
  return ScheduledCallQueries.deleteForEndpoint(endpointId, trx);
}

export function jobIdsForProject(projectId: string): Promise<string[]> {
  return ScheduledCallQueries.jobIdsForProject(projectId);
}

/* ----------------------------------------------------------------- */
/* Orphan cleanup                                                    */
/* ----------------------------------------------------------------- */

// Jobs younger than this are skipped: a create stores its row just after the job.
const ORPHAN_GRACE_MS = 5 * 60_000;
const RECONCILE_EVERY_MS = 60_000;
let lastReconcile = 0;

/**
 * Delete scheduler jobs this database created that no scheduled call owns any more
 * (row deleted by a cascade, or a delete that couldn't reach the scheduler).
 * Returns how many jobs were deleted.
 */
export async function reconcileOrphans(now = Date.now()): Promise<number> {
  const jobs = await SchedulerClient.listJobs();
  const ours = jobs
    .map((job) => ({ job, id: parseJobName(job.name) }))
    .filter(
      (x): x is { job: SchedulerJob; id: string } =>
        x.id !== null && now - Date.parse(x.job.createdAt) > ORPHAN_GRACE_MS
    );
  if (ours.length === 0) return 0;

  const rows = await ScheduledCallQueries.findByIds(ours.map((x) => x.id));
  const owner = new Map(rows.map((r) => [r.id, r.schedulerJobId]));
  const orphans = ours.filter((x) => owner.get(x.id) !== x.job.id).map((x) => x.job.id);
  await dropJobs(orphans);
  if (orphans.length > 0) logger.info(`[scheduler] removed ${orphans.length} orphaned job(s)`);
  return orphans.length;
}

/**
 * Scheduler availability for the dashboard. A fresh probe that finds the
 * scheduler up also sweeps orphaned jobs, which catches the ones that never fire
 * again (paused, or one-time and finished) and so never hit the 410 path.
 */
export async function schedulerStatus(): Promise<SchedulerStatus.SchedulerStatusResponse> {
  const { status, probed } = await SchedulerStatus.checkStatus();
  if (probed && status.available) reconcileSoon();
  return status;
}

/** Throttled background {@link reconcileOrphans}: at most once a minute per process. */
export function reconcileSoon(): void {
  const now = Date.now();
  if (now - lastReconcile < RECONCILE_EVERY_MS) return;
  lastReconcile = now;
  reconcileOrphans(now).catch((err) =>
    logger.warn({ err }, '[scheduler] orphaned job cleanup failed')
  );
}

/** Tests only: let the next {@link reconcileSoon} run regardless of the throttle. */
export function resetReconcileThrottleForTests(): void {
  lastReconcile = 0;
}
