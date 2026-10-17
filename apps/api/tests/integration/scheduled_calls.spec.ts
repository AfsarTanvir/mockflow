import { randomUUID } from 'node:crypto';
import { test } from '@japa/runner';
import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import testUtils from '@adonisjs/core/services/test_utils';
import { DateTime } from 'luxon';
import env from '#start/env';
import User from '#models/user';
import Project from '#models/project';
import Endpoint from '#models/endpoint';
import ScheduledCall from '#models/scheduled_call';
import TeamMember from '#models/team_member';
import * as cache from '#services/cache_service';
import * as EndpointService from '#services/endpoint_service';
import * as ProjectService from '#services/project_service';
import * as VersionService from '#services/version_service';
import * as ScheduledCallService from '#services/scheduled_call_service';
import * as SchedulerStatusService from '#services/scheduler_status_service';
import { resolveMock } from '#services/mock_service';
import { FakeScheduler, eventually } from '../helpers/fake_scheduler.js';

/**
 * Scheduled calls against an in-memory fake of local-scheduler's API. Covers the
 * availability check, the create → job spec mapping, access rules, keeping jobs in
 * sync when endpoints/projects go away or a version is restored, the mock route's
 * schedule secret, and orphaned-job cleanup.
 *
 * Runs with or without Redis; the one caching assertion checks for Redis first.
 */
test.group('scheduled calls', (group) => {
  const fake = new FakeScheduler();
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  group.setup(async () => {
    // Warm the Redis connection so the first test's cache ops don't race the connect.
    await cache.isConnected();
    await fake.start();
    savedUrl = env.get('SCHEDULER_URL');
    savedKey = env.get('SCHEDULER_API_KEY');
    return async () => {
      env.set('SCHEDULER_URL', savedUrl ?? '');
      env.set('SCHEDULER_API_KEY', savedKey ?? '');
      await fake.stop();
    };
  });

  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(async () => {
    fake.reset();
    env.set('SCHEDULER_URL', fake.url);
    env.set('SCHEDULER_API_KEY', '');
    await cache.flushAll().catch(() => {});
    return async () => {
      await cache.flushAll().catch(() => {});
    };
  });

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function seed(opts: { isPublic?: boolean } = {}) {
    const id = uniq();
    const owner = await User.create({
      name: `U ${id}`,
      email: `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    const project = await Project.create({
      name: 'P',
      slug: `p-${id}`,
      basePath: '/',
      ownerId: owner.id,
      isPublic: opts.isPublic ?? false,
      settings: { cors: false, log_requests: false, global_headers: {} },
    });
    const endpoint = await makeEndpoint(project.id, { method: 'GET', path: '/users/:id' });
    return { owner, project, endpoint };
  }

  function makeEndpoint(projectId: string, partial: Partial<Endpoint> = {}) {
    return Endpoint.create({
      projectId,
      method: 'GET',
      path: '/ping',
      statusCode: 200,
      responseBody: { ok: true },
      responseHeaders: {},
      delayMs: 0,
      delayMaxMs: null,
      isActive: true,
      ...partial,
    } as Partial<Endpoint>);
  }

  async function addUser(projectId: string, role: 'viewer' | 'member') {
    const id = uniq();
    const user = await User.create({
      name: `C ${id}`,
      email: `c-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    await TeamMember.create({ projectId, userId: user.id, role, invitedAt: DateTime.now() });
    return user;
  }

  const repeatEvery10m = (endpointId: string, path = '/users/42') => ({
    endpointId,
    path,
    mode: 'repeat' as const,
    intervalSeconds: 600,
  });

  async function status(promise: Promise<unknown>): Promise<number | null> {
    try {
      await promise;
      return null;
    } catch (error) {
      return error instanceof Exception ? (error.status ?? null) : null;
    }
  }

  function requestWith(headers: Record<string, string>): HttpContext['request'] {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
    return {
      header: (name: string) => lower[name.toLowerCase()],
      qs: () => ({}),
      body: () => ({}),
    } as unknown as HttpContext['request'];
  }

  /** The secret MockFlow handed the scheduler for a job. */
  const tokenOf = (jobId: string) =>
    fake.jobs.get(jobId)!.http.headers![ScheduledCallService.SCHEDULE_TOKEN_HEADER]!;

  const onlyJob = () => [...fake.jobs.values()][0]!;

  /* ---------------- availability ---------------- */

  test('status: not configured when SCHEDULER_URL is unset', async ({ assert }) => {
    env.set('SCHEDULER_URL', '');
    const s = await SchedulerStatusService.getStatus();
    assert.isFalse(s.available);
    assert.equal(s.reason, 'not_configured');
    assert.equal(fake.requests.length, 0);
  });

  test('status: available when the scheduler answers', async ({ assert }) => {
    const s = await SchedulerStatusService.getStatus();
    assert.isTrue(s.available);
    assert.isNull(s.reason);
    assert.isAbove(s.expiresIn, 590);
    assert.isAtMost(s.expiresIn, SchedulerStatusService.STATUS_TTL_SECONDS);
  });

  test('status: cached for 10 minutes when Redis is up', async ({ assert }) => {
    if (!(await cache.isConnected())) return; // degraded mode: every call probes
    const first = await SchedulerStatusService.getStatus();
    const second = await SchedulerStatusService.getStatus();
    assert.equal(second.checkedAt, first.checkedAt);
    assert.equal(fake.count('GET', '/jobs/'), 1);
  });

  test('status: a wrong API key reads as unavailable', async ({ assert }) => {
    fake.apiKey = 'right';
    env.set('SCHEDULER_API_KEY', 'wrong');
    const s = await SchedulerStatusService.getStatus();
    assert.isFalse(s.available);
    assert.equal(s.reason, 'unauthorized');
  });

  test('status: unreachable when nothing listens', async ({ assert }) => {
    env.set('SCHEDULER_URL', 'http://127.0.0.1:1');
    const s = await SchedulerStatusService.getStatus();
    assert.isFalse(s.available);
    assert.equal(s.reason, 'unreachable');
  });

  /* ---------------- create ---------------- */

  test('create (repeat) registers an @every job that calls the mock URL', async ({ assert }) => {
    fake.apiKey = 'k';
    env.set('SCHEDULER_API_KEY', 'k');
    const { owner, project, endpoint } = await seed();

    const view = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      ...repeatEvery10m(endpoint.id),
      requestHeaders: { 'X-Trace': 'abc' },
    });

    const job = onlyJob();
    assert.equal(job.schedule, '@every 10m');
    assert.isUndefined(job.runAt);
    assert.equal(job.http.method, 'GET');
    assert.match(job.http.url, new RegExp(`/mock/${project.slug}/users/42$`));
    assert.equal(job.http.headers!['X-Trace'], 'abc');
    assert.lengthOf(tokenOf(job.id), 43);
    assert.equal(job.name, ScheduledCallService.jobName(view.id));

    const row = await ScheduledCall.findOrFail(view.id);
    assert.equal(row.schedulerJobId, job.id);
    assert.equal(row.tokenHash, ScheduledCallService.hashToken(tokenOf(job.id)));
    assert.deepEqual(row.requestHeaders, { 'X-Trace': 'abc' }); // the secret is never stored
    assert.equal(view.sync, 'ok');
    assert.isTrue(view.matchesEndpoint);
    assert.notProperty(view, 'tokenHash');
  });

  test('create (once) sends runAt in UTC and a JSON body', async ({ assert }) => {
    const { owner, project } = await seed();
    const post = await makeEndpoint(project.id, { method: 'POST', path: '/orders' });
    const at = DateTime.now().plus({ hours: 2 }).setZone('Asia/Dhaka');

    const view = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      endpointId: post.id,
      path: '/orders?source=cron',
      mode: 'once',
      runAt: at.toISO()!,
      requestBody: '{"qty":1}',
    });

    const job = onlyJob();
    assert.equal(Date.parse(job.runAt!), at.toMillis());
    assert.isTrue(job.runAt!.endsWith('Z'));
    assert.isUndefined(job.schedule);
    assert.equal(job.http.body, '{"qty":1}');
    assert.equal(job.http.headers!['Content-Type'], 'application/json');
    assert.equal(view.mode, 'once');
    assert.isNull(view.intervalSeconds);
  });

  test('create rejects bad input with 422', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const create = (extra: object) =>
      ScheduledCallService.createScheduledCall(project.id, owner.id, {
        ...repeatEvery10m(endpoint.id),
        ...extra,
      });

    assert.equal(await status(create({ path: '/orders/42' })), 422); // wrong endpoint
    assert.equal(await status(create({ path: '/users/..' })), 422); // would leave /mock/{slug}
    assert.equal(await status(create({ mode: 'once', runAt: '2001-01-01T00:00:00Z' })), 422);
    assert.equal(await status(create({ mode: 'once', runAt: 'tomorrow' })), 422);
    assert.equal(await status(create({ mode: 'repeat', intervalSeconds: undefined })), 422);
    assert.equal(await status(create({ requestHeaders: { 'X-MockFlow-Schedule': 'x' } })), 422);
    assert.equal(await status(create({ requestHeaders: { 'Bad Name': 'x' } })), 422);
    assert.equal(await status(create({ requestBody: '{}' })), 422); // GET with a body
  });

  test('create: viewers get 403, other projects’ endpoints 404', async ({ assert }) => {
    const { project, endpoint } = await seed();
    const viewer = await addUser(project.id, 'viewer');
    const member = await addUser(project.id, 'member');
    const other = await seed();

    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(project.id, viewer.id, repeatEvery10m(endpoint.id))
      ),
      403
    );
    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(
          project.id,
          member.id,
          repeatEvery10m(other.endpoint.id)
        )
      ),
      404
    );
    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(project.id, member.id, repeatEvery10m(endpoint.id))
      ),
      null
    );
  });

  test('create: at most 20 per project', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    for (let i = 0; i < ScheduledCallService.MAX_SCHEDULES_PER_PROJECT; i++) {
      await ScheduledCallService.createScheduledCall(
        project.id,
        owner.id,
        repeatEvery10m(endpoint.id, `/users/${i}`)
      );
    }
    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(project.id, owner.id, repeatEvery10m(endpoint.id))
      ),
      409
    );
  });

  test('create while the scheduler is down → 503 and status flips to unavailable', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed();
    env.set('SCHEDULER_URL', 'http://127.0.0.1:1');

    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(project.id, owner.id, repeatEvery10m(endpoint.id))
      ),
      503
    );
    assert.lengthOf(await ScheduledCall.query().where('project_id', project.id), 0);

    if (await cache.isConnected()) {
      env.set('SCHEDULER_URL', fake.url); // back up, but the cached answer still says no
      const s = await SchedulerStatusService.getStatus();
      assert.isFalse(s.available);
      assert.equal(s.reason, 'unreachable');
    }
  });

  test('create: runAt needs an explicit time zone', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const at = DateTime.now().plus({ hours: 2 });
    const create = (runAt: string) =>
      ScheduledCallService.createScheduledCall(project.id, owner.id, {
        endpointId: endpoint.id,
        path: '/users/1',
        mode: 'once',
        runAt,
      });

    assert.equal(await status(create(at.toFormat("yyyy-MM-dd'T'HH:mm:ss"))), 422);
    assert.equal(await status(create(at.toUTC().toISO()!)), null);
    assert.equal(await status(create(at.setZone('Asia/Dhaka').toISO()!)), null);
  });

  test('create: the call belongs to the endpoint that actually serves the path', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed(); // GET /users/:id
    const me = await makeEndpoint(project.id, { method: 'GET', path: '/users/me' });

    assert.equal(
      await status(
        ScheduledCallService.createScheduledCall(project.id, owner.id, {
          ...repeatEvery10m(endpoint.id),
          path: '/users/me',
        })
      ),
      422
    );
    const ok = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      ...repeatEvery10m(me.id),
      path: '/users/me',
    });
    assert.isTrue(ok.matchesEndpoint);

    // An inactive more-specific endpoint doesn't serve anything: /users/:id does.
    me.isActive = false;
    await me.save();
    const viaParam = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      ...repeatEvery10m(endpoint.id),
      path: '/users/me',
    });
    assert.isTrue(viaParam.matchesEndpoint);
  });

  test('list: matchesEndpoint turns false when a more specific endpoint takes over', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      ...repeatEvery10m(endpoint.id),
      path: '/users/me',
    });
    assert.isTrue(view.matchesEndpoint);

    await makeEndpoint(project.id, { method: 'GET', path: '/users/me' });
    const [after] = await ScheduledCallService.listForProject(project.id, owner.id);
    assert.isFalse(after!.matchesEndpoint);
  });

  test('resume: a one-time call whose time has passed → 409, no surprise run', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      endpointId: endpoint.id,
      path: '/users/1',
      mode: 'once',
      runAt: DateTime.now().plus({ hours: 1 }).toISO()!,
    });
    await ScheduledCallService.setScheduledCallActive(view.id, owner.id, false);
    const row = await ScheduledCall.findOrFail(view.id);
    row.runAt = DateTime.now().minus({ minutes: 5 }); // its time passed while paused
    await row.save();

    const resumes = fake.count('POST', `/jobs/${onlyJob().id}/resume`);
    assert.equal(
      await status(ScheduledCallService.setScheduledCallActive(view.id, owner.id, true)),
      409
    );
    assert.equal(fake.count('POST', `/jobs/${onlyJob().id}/resume`), resumes);
    assert.isFalse((await ScheduledCall.findOrFail(view.id)).isActive);
  });

  test('a single failed call re-probes: a blip keeps scheduling available', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    await SchedulerStatusService.getStatus(); // cache "available"

    fake.failNext = 1;
    assert.equal(
      await status(ScheduledCallService.setScheduledCallActive(view.id, owner.id, false)),
      503
    );
    const s = await SchedulerStatusService.getStatus();
    assert.isTrue(s.available);
    assert.isTrue((await ScheduledCall.findOrFail(view.id)).isActive); // failed pause changed nothing
  });

  test('a fresh status probe also sweeps orphaned jobs', async ({ assert }) => {
    const old = new Date(Date.now() - 60 * 60_000).toISOString();
    // A paused orphan never fires, so the 410 path would never clean it up.
    const orphan = fake.seed({
      name: ScheduledCallService.jobName(randomUUID()),
      createdAt: old,
      enabled: false,
    });
    ScheduledCallService.resetReconcileThrottleForTests();

    const s = await ScheduledCallService.schedulerStatus();
    assert.isTrue(s.available);
    assert.isTrue(await eventually(() => !fake.jobs.has(orphan.id)));

    // A cached answer doesn't sweep again.
    const again = fake.seed({ name: ScheduledCallService.jobName(randomUUID()), createdAt: old });
    ScheduledCallService.resetReconcileThrottleForTests();
    if (await cache.isConnected()) {
      await ScheduledCallService.schedulerStatus();
      await new Promise((r) => setTimeout(r, 200));
      assert.isTrue(fake.jobs.has(again.id));
    }
  });

  test('the job URL includes the project base path, and the mock answers there', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed({ isPublic: false });
    project.basePath = '/v1';
    await project.save();

    await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const job = onlyJob();
    assert.match(job.http.url, new RegExp(`/mock/${project.slug}/v1/users/42$`));

    const res = await resolveMock(
      project.slug,
      'GET',
      '/v1/users/42',
      requestWith({ [ScheduledCallService.SCHEDULE_TOKEN_HEADER]: tokenOf(job.id) }),
      Date.now()
    );
    assert.equal(res.statusCode, 200);
  });

  test('a base path change after scheduling is flagged (matchesEndpoint false)', async ({
    assert,
  }) => {
    const { owner, project, endpoint } = await seed();
    await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const [before] = await ScheduledCallService.listForProject(project.id, owner.id);
    assert.isTrue(before!.matchesEndpoint);

    project.basePath = '/v2';
    await project.save();
    const [after] = await ScheduledCallService.listForProject(project.id, owner.id);
    assert.isFalse(after!.matchesEndpoint);
  });

  /* ---------------- list / pause / resume / run / delete ---------------- */

  test('list merges live state; scheduler down → sync unknown', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const viewer = await addUser(project.id, 'viewer');
    await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );

    const [live] = await ScheduledCallService.listForProject(project.id, viewer.id);
    assert.equal(live!.sync, 'ok');
    assert.isTrue(live!.live!.enabled);
    assert.isString(live!.live!.nextRunAt);

    fake.jobs.clear();
    const [missing] = await ScheduledCallService.listForProject(project.id, viewer.id);
    assert.equal(missing!.sync, 'missing');

    env.set('SCHEDULER_URL', 'http://127.0.0.1:1');
    const [unknown] = await ScheduledCallService.listForProject(project.id, viewer.id);
    assert.equal(unknown!.sync, 'unknown');
    assert.isNull(unknown!.live);
  });

  test('pause, resume and run now go through the scheduler', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const job = onlyJob();

    const paused = await ScheduledCallService.setScheduledCallActive(view.id, owner.id, false);
    assert.isFalse(paused.isActive);
    assert.isFalse(job.enabled);

    const resumed = await ScheduledCallService.setScheduledCallActive(view.id, owner.id, true);
    assert.isTrue(resumed.isActive);
    assert.isTrue(job.enabled);

    await ScheduledCallService.runScheduledCallNow(view.id, owner.id);
    assert.equal(fake.count('POST', `/jobs/${job.id}/run`), 1);

    job.running = true;
    assert.equal(await status(ScheduledCallService.runScheduledCallNow(view.id, owner.id)), 409);

    const runs = await ScheduledCallService.listRuns(view.id, owner.id);
    assert.lengthOf(runs, 1);

    fake.jobs.clear();
    assert.equal(await status(ScheduledCallService.listRuns(view.id, owner.id)), 409); // lost
  });

  test('delete removes the row and the job', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );

    await ScheduledCallService.deleteScheduledCall(view.id, owner.id);
    assert.isNull(await ScheduledCall.find(view.id));
    assert.equal(fake.jobs.size, 0);
  });

  test('delete still works while the scheduler is down', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    env.set('SCHEDULER_URL', 'http://127.0.0.1:1');

    await ScheduledCallService.deleteScheduledCall(view.id, owner.id);
    assert.isNull(await ScheduledCall.find(view.id));
    assert.equal(fake.jobs.size, 1); // left for the orphan cleanup
  });

  /* ---------------- keeping jobs in sync ---------------- */

  test('deleting the endpoint deletes its scheduled calls and jobs', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );

    await EndpointService.deleteEndpoint(endpoint.id, owner.id);
    assert.isNull(await ScheduledCall.find(view.id));
    assert.isTrue(await eventually(() => fake.jobs.size === 0));
  });

  test('deleting the project drops its jobs', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );

    await ProjectService.deleteProject(project.id, owner.id);
    assert.isTrue(await eventually(() => fake.jobs.size === 0));
  });

  test('version restore re-links calls by path and drops unmatched ones', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const kept = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const version = await VersionService.createVersion(project.id, owner.id, 'U', 'v1');

    const extra = await makeEndpoint(project.id, { method: 'GET', path: '/extra' });
    const dropped = await ScheduledCallService.createScheduledCall(project.id, owner.id, {
      ...repeatEvery10m(extra.id),
      path: '/extra',
    });
    const droppedJobId = (await ScheduledCall.findOrFail(dropped.id)).schedulerJobId;

    await VersionService.restoreVersion(project.id, owner.id, version.id);

    const restored = await Endpoint.query()
      .where('project_id', project.id)
      .where('path', '/users/:id')
      .firstOrFail();
    const keptRow = await ScheduledCall.findOrFail(kept.id);
    assert.equal(keptRow.endpointId, restored.id);
    assert.isNull(await ScheduledCall.find(dropped.id));
    assert.isTrue(await eventually(() => !fake.jobs.has(droppedJobId)));
    assert.equal(fake.jobs.size, 1);
  });

  /* ---------------- mock route secret ---------------- */

  test('the schedule secret unlocks its own private project only', async ({ assert }) => {
    const { owner, project, endpoint } = await seed({ isPublic: false });
    await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const token = tokenOf(onlyJob().id);
    const header = { [ScheduledCallService.SCHEDULE_TOKEN_HEADER]: token };
    const mock = (slug: string, headers: Record<string, string> = {}) =>
      resolveMock(slug, 'GET', '/users/42', requestWith(headers), Date.now());

    assert.equal((await mock(project.slug, header)).statusCode, 200);
    assert.equal(await status(mock(project.slug)), 404); // anonymous

    const other = await seed({ isPublic: false });
    assert.equal(await status(mock(other.project.slug, header)), 404);
  });

  test('an unknown schedule secret answers 410', async ({ assert }) => {
    const { project } = await seed({ isPublic: true });
    const res = resolveMock(
      project.slug,
      'GET',
      '/users/42',
      requestWith({ [ScheduledCallService.SCHEDULE_TOKEN_HEADER]: 'deleted-schedule' }),
      Date.now()
    );
    assert.equal(await status(res), 410);
  });

  /* ---------------- orphan cleanup ---------------- */

  test('reconcile deletes only this database’s orphaned, settled jobs', async ({ assert }) => {
    const { owner, project, endpoint } = await seed();
    const view = await ScheduledCallService.createScheduledCall(
      project.id,
      owner.id,
      repeatEvery10m(endpoint.id)
    );
    const owned = onlyJob();
    const old = new Date(Date.now() - 60 * 60_000).toISOString();
    owned.createdAt = old;

    const orphan = fake.seed({ name: ScheduledCallService.jobName(randomUUID()), createdAt: old });
    const young = fake.seed({ name: ScheduledCallService.jobName(randomUUID()) });
    const foreign = fake.seed({ name: 'backup-database', createdAt: old });
    const duplicate = fake.seed({ name: ScheduledCallService.jobName(view.id), createdAt: old });

    const removed = await ScheduledCallService.reconcileOrphans();

    assert.equal(removed, 2);
    assert.isFalse(fake.jobs.has(orphan.id));
    assert.isFalse(fake.jobs.has(duplicate.id));
    assert.isTrue(fake.jobs.has(owned.id));
    assert.isTrue(fake.jobs.has(young.id));
    assert.isTrue(fake.jobs.has(foreign.id));
  });
});
