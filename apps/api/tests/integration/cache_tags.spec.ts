import { test } from '@japa/runner';
import type { HttpContext } from '@adonisjs/core/http';
import testUtils from '@adonisjs/core/services/test_utils';
import redis from '@adonisjs/redis/services/main';
import env from '#start/env';
import User from '#models/user';
import Project from '#models/project';
import Endpoint from '#models/endpoint';
import * as cache from '#services/cache_service';
import { cacheKeys, cacheTags } from '#services/cache_keys';
import * as CompanyService from '#services/company_service';
import * as TeamService from '#services/team_service';
import { resolveMock } from '#services/mock_service';

/**
 * Scope tags: every cached value is indexed under its project / team / company,
 * so a whole scope can be purged in one call. Also pins test isolation: tests
 * write under their own cache namespace, never the dev one. (Requires Redis.)
 */
test.group('cache scope tags', (group) => {
  group.setup(async () => {
    await cache.isConnected();
    await new Promise((r) => setTimeout(r, 150));
  });
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(async () => {
    await cache.flushAll();
    return async () => {
      await cache.flushAll();
    };
  });

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  const request = {
    header: () => undefined,
    qs: () => ({}),
    body: () => ({}),
  } as unknown as HttpContext['request'];

  async function makeUser() {
    const id = uniq();
    return User.create({
      name: `U ${id}`,
      email: `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
  }

  /** A public team project with one GET endpoint, inside a fresh company. */
  async function seedTeamProject() {
    const owner = await makeUser();
    const { company, profile } = await CompanyService.createCompany(owner.id, {
      name: `Co ${uniq()}`,
    });
    const team = await TeamService.createTeam(company.id, profile.id, { name: `Team ${uniq()}` });
    const project = await Project.create({
      name: 'P',
      slug: `p-${uniq()}`,
      basePath: '/',
      ownerId: owner.id,
      teamId: team.id,
      isPublic: true,
      settings: { cors: true, log_requests: false, global_headers: {} },
    });
    await Endpoint.create({
      projectId: project.id,
      method: 'GET',
      path: '/ping',
      statusCode: 200,
      responseBody: { ok: true },
      responseHeaders: {},
      delayMs: 0,
      delayMaxMs: null,
      isActive: true,
      createdBy: owner.id,
    });
    return { owner, company, team, project };
  }

  const hit = (slug: string) => resolveMock(slug, 'GET', '/ping', request, Date.now());

  test('keys land under the test namespace, never the dev one', async ({ assert }) => {
    assert.equal(env.get('CACHE_PREFIX'), 'mockflow:test:cache:');
    await cache.set('probe:1', { a: 1 }, 60);
    assert.equal(await redis.exists('mockflow:test:cache:probe:1'), 1);
    assert.equal(await redis.exists('mockflow:cache:probe:1'), 0);
  });

  test('purgeTag deletes exactly the tagged keys', async ({ assert }) => {
    await cache.set('probe:a', 1, 60, ['project:x']);
    await cache.set('probe:b', 2, 60, ['project:x', 'company:y']);
    await cache.set('probe:c', 3, 60);

    assert.deepEqual(await cache.tagMembers('project:x'), ['probe:a', 'probe:b']);
    assert.equal(await cache.purgeTag('project:x'), 2);

    assert.isNull(await cache.get('probe:a'));
    assert.isNull(await cache.get('probe:b'));
    assert.equal(await cache.get('probe:c'), 3);
    assert.deepEqual(await cache.tagMembers('project:x'), []);
  });

  test('a mock hit indexes slug + blueprint under project, team and company', async ({
    assert,
  }) => {
    const { company, team, project } = await seedTeamProject();
    await hit(project.slug);

    const expected = [cacheKeys.mockBlueprint(project.id), cacheKeys.mockSlug(project.slug)].sort();
    assert.deepEqual(await cache.tagMembers(cacheTags.project(project.id)), expected);
    assert.deepEqual(await cache.tagMembers(cacheTags.team(team.id)), expected);
    assert.deepEqual(await cache.tagMembers(cacheTags.company(company.id)), expected);
  });

  test('purgeCompany drops every cached mock of the company', async ({ assert }) => {
    const { company, project } = await seedTeamProject();
    await hit(project.slug);
    assert.isNotNull(await cache.get(cacheKeys.mockBlueprint(project.id)));

    assert.equal(await cache.purgeCompany(company.id), 2);
    assert.isNull(await cache.get(cacheKeys.mockBlueprint(project.id)));
    assert.isNull(await cache.get(cacheKeys.mockSlug(project.slug)));
  });

  test('deleting a team purges its projects’ cached mocks', async ({ assert }) => {
    const { team, project } = await seedTeamProject();
    await hit(project.slug);

    await TeamService.deleteTeam(team.id);

    assert.isNull(await cache.get(cacheKeys.mockBlueprint(project.id)));
    assert.isNull(await cache.get(cacheKeys.mockSlug(project.slug)));
  });
});
