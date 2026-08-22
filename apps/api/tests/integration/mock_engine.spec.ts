import { test } from '@japa/runner';
import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Project from '#models/project';
import Endpoint from '#models/endpoint';
import EndpointScenario from '#models/endpoint_scenario';
import ScenarioRule from '#models/scenario_rule';
import RequestLog from '#models/request_log';
import TeamMember from '#models/team_member';
import * as cache from '#services/cache_service';
import { buildBlueprint } from '#services/mock_blueprint';
import { resolveMock } from '#services/mock_service';
import { DateTime } from 'luxon';

/**
 * The mock execution engine — the product's core read path. Everything here goes
 * through the real resolveMock: slug resolution, blueprint build, private-project
 * gating, method+path matching, scenario selection, header merging and logging.
 *
 * Runs with or without Redis: cache_service degrades to DB-only, so the flushes
 * below are best-effort.
 */
test.group('mock engine', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  // Redis isn't transactional. Flush around each test so a blueprint cached by
  // one test can't answer another; tolerate Redis being absent entirely.
  group.each.setup(async () => {
    await cache.flushAll().catch(() => {});
    return async () => {
      await cache.flushAll().catch(() => {});
    };
  });

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  /** Minimal request stub — resolveMock only reaches .header/.qs/.body. */
  function makeRequest(
    opts: {
      headers?: Record<string, string>;
      query?: Record<string, string>;
      body?: unknown;
    } = {}
  ): HttpContext['request'] {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.headers ?? {})) lower[k.toLowerCase()] = v;
    return {
      header: (name: string) => lower[name.toLowerCase()],
      qs: () => opts.query ?? {},
      body: () => opts.body ?? {},
    } as unknown as HttpContext['request'];
  }

  type Settings = { cors: boolean; log_requests: boolean; global_headers?: Record<string, string> };

  async function seedProject(
    opts: { isPublic?: boolean; settings?: Partial<Settings> } = {}
  ): Promise<{ owner: User; project: Project }> {
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
      isPublic: opts.isPublic ?? true,
      settings: {
        cors: false,
        log_requests: false,
        global_headers: {},
        ...opts.settings,
      } as Settings,
    });
    return { owner, project };
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

  /** resolveMock's signature, with the boring arguments defaulted. */
  const call = (
    slug: string,
    method: string,
    path: string,
    opts: { request?: HttpContext['request']; userId?: string } = {}
  ) => resolveMock(slug, method, path, opts.request ?? makeRequest(), Date.now(), opts.userId);

  async function status(promise: Promise<unknown>): Promise<number | null> {
    try {
      await promise;
      return null;
    } catch (error) {
      return error instanceof Exception ? (error.status ?? null) : null;
    }
  }

  /* ---------------- slug + endpoint resolution ---------------- */

  test('an unknown project slug is a 404', async ({ assert }) => {
    assert.equal(await status(call(`nope-${uniq()}`, 'GET', '/ping')), 404);
  });

  test('a matching method + path returns the endpoint response', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { path: '/ping', responseBody: { pong: true } });

    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { pong: true });
  });

  test('the same path under a different method does not match', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { method: 'GET', path: '/ping' });

    assert.equal(await status(call(project.slug, 'POST', '/ping')), 404);
  });

  test('an inactive endpoint is not served', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { path: '/hidden', isActive: false });

    assert.equal(await status(call(project.slug, 'GET', '/hidden')), 404);
  });

  test('a path parameter matches and is substituted into the body', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, {
      path: '/users/:id',
      responseBody: { userId: '{{param.id}}', nested: { echo: 'id={{param.id}}' } },
    });

    const res = await call(project.slug, 'GET', '/users/42');

    assert.deepEqual(res.body, { userId: '42', nested: { echo: 'id=42' } });
  });

  test('endpoints are matched in creation order, first match wins', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { path: '/users/:id', responseBody: { via: 'param' } });
    await makeEndpoint(project.id, { path: '/users/me', responseBody: { via: 'literal' } });

    // The older, broader pattern is reached first — documents current behaviour.
    const res = await call(project.slug, 'GET', '/users/me');
    assert.deepEqual(res.body, { via: 'param' });
  });

  /* ---------------- private project gating ---------------- */

  test('a private project is a 404 for an anonymous caller', async ({ assert }) => {
    const { project } = await seedProject({ isPublic: false });
    await makeEndpoint(project.id, { path: '/ping' });

    assert.equal(await status(call(project.slug, 'GET', '/ping')), 404);
  });

  test('a private project is a 404 for a non-member, hiding its existence', async ({ assert }) => {
    const { project } = await seedProject({ isPublic: false });
    await makeEndpoint(project.id, { path: '/ping' });
    const { owner: stranger } = await seedProject();

    assert.equal(await status(call(project.slug, 'GET', '/ping', { userId: stranger.id })), 404);
  });

  test('a private project serves its owner', async ({ assert }) => {
    const { owner, project } = await seedProject({ isPublic: false });
    await makeEndpoint(project.id, { path: '/ping', responseBody: { secret: true } });

    const res = await call(project.slug, 'GET', '/ping', { userId: owner.id });
    assert.deepEqual(res.body, { secret: true });
  });

  test('a private project serves a viewer-level member', async ({ assert }) => {
    const { project } = await seedProject({ isPublic: false });
    await makeEndpoint(project.id, { path: '/ping' });
    const { owner: viewer } = await seedProject();
    await TeamMember.create({
      projectId: project.id,
      userId: viewer.id,
      role: 'viewer',
      invitedAt: DateTime.now(),
    });

    const res = await call(project.slug, 'GET', '/ping', { userId: viewer.id });
    assert.equal(res.statusCode, 200);
  });

  /* ---------------- scenario selection ---------------- */

  async function addScenario(
    endpointId: string,
    partial: Partial<EndpointScenario> = {}
  ): Promise<EndpointScenario> {
    return EndpointScenario.create({
      endpointId,
      name: `s-${uniq()}`,
      description: null,
      statusCode: null,
      responseBody: null,
      responseHeaders: null,
      delayMs: null,
      delayMaxMs: null,
      isActive: false,
      priority: 0,
      ...partial,
    } as Partial<EndpointScenario>);
  }

  test('with no scenarios the endpoint default is served', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { statusCode: 201, responseBody: { d: 'default' } });

    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { d: 'default' });
    assert.isUndefined(res.headers['X-MockFlow-Scenario']);
  });

  test('a manually activated scenario overrides the endpoint default', async ({ assert }) => {
    const { project } = await seedProject();
    const endpoint = await makeEndpoint(project.id);
    await addScenario(endpoint.id, {
      name: 'maintenance',
      isActive: true,
      statusCode: 503,
      responseBody: { down: true },
    });

    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { down: true });
    assert.equal(res.headers['X-MockFlow-Scenario'], 'maintenance');
  });

  test('a rule-matched scenario beats the manually activated one', async ({ assert }) => {
    const { project } = await seedProject();
    const endpoint = await makeEndpoint(project.id);
    await addScenario(endpoint.id, { name: 'manual', isActive: true, statusCode: 503 });
    const ruled = await addScenario(endpoint.id, {
      name: 'by-header',
      priority: 1,
      statusCode: 418,
    });
    await ScenarioRule.create({
      scenarioId: ruled.id,
      source: 'header',
      field: 'x-test-case',
      operator: 'equals',
      value: 'teapot',
    });

    const withHeader = await call(project.slug, 'GET', '/ping', {
      request: makeRequest({ headers: { 'X-Test-Case': 'teapot' } }),
    });
    assert.equal(withHeader.statusCode, 418);
    assert.equal(withHeader.headers['X-MockFlow-Scenario'], 'by-header');

    // Rule misses -> falls back to the manually activated scenario.
    const withoutHeader = await call(project.slug, 'GET', '/ping');
    assert.equal(withoutHeader.statusCode, 503);
    assert.equal(withoutHeader.headers['X-MockFlow-Scenario'], 'manual');
  });

  test('a scenario only overrides the fields it sets', async ({ assert }) => {
    const { project } = await seedProject();
    const endpoint = await makeEndpoint(project.id, {
      statusCode: 200,
      responseBody: { from: 'endpoint' },
    });
    // statusCode set, responseBody left null -> body must come from the endpoint.
    await addScenario(endpoint.id, { name: 'status-only', isActive: true, statusCode: 202 });

    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, { from: 'endpoint' });
  });

  /* ---------------- headers ---------------- */

  test('endpoint headers win over project global headers', async ({ assert }) => {
    const { project } = await seedProject({
      settings: { global_headers: { 'X-Shared': 'global', 'X-Only-Global': 'yes' } },
    });
    await makeEndpoint(project.id, { responseHeaders: { 'X-Shared': 'endpoint' } });

    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.headers['X-Shared'], 'endpoint');
    assert.equal(res.headers['X-Only-Global'], 'yes');
  });

  test('cors headers appear only when the project enables cors', async ({ assert }) => {
    const on = await seedProject({ settings: { cors: true } });
    await makeEndpoint(on.project.id);
    const off = await seedProject({ settings: { cors: false } });
    await makeEndpoint(off.project.id);

    const withCors = await call(on.project.slug, 'GET', '/ping');
    const without = await call(off.project.slug, 'GET', '/ping');

    assert.equal(withCors.headers['Access-Control-Allow-Origin'], '*');
    assert.isUndefined(without.headers['Access-Control-Allow-Origin']);
  });

  test('diagnostic X-MockFlow headers describe the match', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { method: 'GET', path: '/users/:id' });

    const res = await call(project.slug, 'GET', '/users/7');

    assert.equal(res.headers['X-MockFlow-Project'], project.slug);
    assert.equal(res.headers['X-MockFlow-Endpoint'], 'GET /users/:id');
    assert.equal(res.headers['X-MockFlow-Delay'], '0ms');
    assert.match(res.headers['X-MockFlow-Elapsed'] ?? '', /^\d+ms$/);
  });

  test('a fixed delay is applied and reported', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { delayMs: 25, delayMaxMs: null });

    const started = Date.now();
    const res = await call(project.slug, 'GET', '/ping');

    assert.equal(res.headers['X-MockFlow-Delay'], '25ms');
    assert.isAtLeast(Date.now() - started, 20);
  });

  test('a delay range stays within its bounds', async ({ assert }) => {
    const { project } = await seedProject();
    await makeEndpoint(project.id, { delayMs: 5, delayMaxMs: 15 });

    const res = await call(project.slug, 'GET', '/ping');

    const ms = Number((res.headers['X-MockFlow-Delay'] ?? '').replace('ms', ''));
    assert.isAtLeast(ms, 5);
    assert.isAtMost(ms, 15);
  });

  /* ---------------- request logging ---------------- */

  test('log_requests writes a request log row', async ({ assert }) => {
    const { project } = await seedProject({ settings: { log_requests: true } });
    const endpoint = await makeEndpoint(project.id, { path: '/logged', statusCode: 201 });

    await call(project.slug, 'GET', '/logged');
    // The write is deliberately fire-and-forget; give it a tick to land.
    await new Promise((r) => setTimeout(r, 150));

    const logs = await RequestLog.query().where('project_id', project.id);
    assert.lengthOf(logs, 1);
    assert.equal(logs[0]!.endpointId, endpoint.id);
    assert.equal(logs[0]!.path, '/logged');
    assert.equal(logs[0]!.statusCode, 201);
  });

  test('logging stays off when the project disables it', async ({ assert }) => {
    const { project } = await seedProject({ settings: { log_requests: false } });
    await makeEndpoint(project.id, { path: '/quiet' });

    await call(project.slug, 'GET', '/quiet');
    await new Promise((r) => setTimeout(r, 150));

    assert.lengthOf(await RequestLog.query().where('project_id', project.id), 0);
  });

  /* ---------------- blueprint ---------------- */

  test('buildBlueprint returns null for a project that is gone', async ({ assert }) => {
    assert.isNull(await buildBlueprint('11111111-2222-3333-4444-555555555555'));
  });

  test('buildBlueprint carries settings and only active endpoints', async ({ assert }) => {
    const { project } = await seedProject({
      isPublic: false,
      settings: { cors: true, log_requests: true },
    });
    await makeEndpoint(project.id, { path: '/on', isActive: true });
    await makeEndpoint(project.id, { path: '/off', isActive: false });

    const bp = await buildBlueprint(project.id);

    assert.isFalse(bp!.isPublic);
    assert.isTrue(bp!.settings.cors);
    assert.deepEqual(
      bp!.endpoints.map((e) => e.path),
      ['/on']
    );
  });

  test('buildBlueprint orders scenarios by priority and attaches their rules', async ({
    assert,
  }) => {
    const { project } = await seedProject();
    const endpoint = await makeEndpoint(project.id);
    await addScenario(endpoint.id, { name: 'second', priority: 5 });
    const first = await addScenario(endpoint.id, { name: 'first', priority: 1 });
    await ScenarioRule.create({
      scenarioId: first.id,
      source: 'query',
      field: 'mode',
      operator: 'equals',
      value: 'test',
    });

    const bp = await buildBlueprint(project.id);
    const scenarios = bp!.endpoints[0]!.scenarios;

    assert.deepEqual(
      scenarios.map((s) => s.name),
      ['first', 'second']
    );
    assert.deepEqual(scenarios[0]!.rules, [
      { source: 'query', field: 'mode', operator: 'equals', value: 'test' },
    ]);
    assert.lengthOf(scenarios[1]!.rules, 0);
  });
});
