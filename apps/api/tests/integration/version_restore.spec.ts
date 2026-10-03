import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Project from '#models/project';
import Endpoint from '#models/endpoint';
import EndpointScenario from '#models/endpoint_scenario';
import ScenarioRule from '#models/scenario_rule';
import VersionHistory, { type VersionSnapshot } from '#models/version_history';
import * as cache from '#services/cache_service';
import * as VersionService from '#services/version_service';

/**
 * Snapshots must round-trip the whole mock: endpoints incl. random delay, their
 * scenarios and rules. Restores must be undoable (automatic backup version).
 */
test.group('version snapshot + restore', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(async () => {
    await cache.flushAll().catch(() => {});
  });

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function seed() {
    const id = uniq();
    const owner = await User.create({
      name: `Owner ${id}`,
      email: `o-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    const project = await Project.create({
      name: 'P',
      slug: `p-${id}`,
      basePath: '/',
      ownerId: owner.id,
      isPublic: true,
      settings: { cors: true, log_requests: false, global_headers: {} },
    });
    const endpoint = await Endpoint.create({
      projectId: project.id,
      method: 'POST',
      path: '/login',
      statusCode: 200,
      responseBody: { token: 'abc' },
      responseHeaders: {},
      delayMs: 100,
      delayMaxMs: 500,
      isActive: true,
      createdBy: owner.id,
    });
    const scenario = await EndpointScenario.create({
      endpointId: endpoint.id,
      name: 'wrong-password',
      description: null,
      statusCode: 401,
      responseBody: { error: 'Invalid credentials' },
      responseHeaders: null,
      delayMs: null,
      delayMaxMs: null,
      isActive: false,
      priority: 0,
    });
    await ScenarioRule.create({
      scenarioId: scenario.id,
      source: 'body',
      field: 'password',
      operator: 'equals',
      value: 'wrong',
    });
    await EndpointScenario.create({
      endpointId: endpoint.id,
      name: 'maintenance',
      description: 'manual switch',
      statusCode: 503,
      responseBody: null,
      responseHeaders: null,
      delayMs: null,
      delayMaxMs: null,
      isActive: true,
      priority: 1,
    });
    return { owner, project };
  }

  async function liveState(projectId: string) {
    const endpoints = await Endpoint.query().where('project_id', projectId);
    const scenarios = endpoints.length
      ? await EndpointScenario.query()
          .whereIn(
            'endpoint_id',
            endpoints.map((e) => e.id)
          )
          .preload('rules')
          .orderBy('priority', 'asc')
      : [];
    return { endpoints, scenarios };
  }

  test('a snapshot captures random delay, scenarios and rules', async ({ assert }) => {
    const { owner, project } = await seed();
    const created = await VersionService.createVersion(project.id, owner.id, owner.name, 'v1');

    const row = await VersionHistory.findOrFail(created.id);
    const snap = row.snapshot as VersionSnapshot;
    assert.equal(snap.format, 2);
    assert.equal(snap.endpoints[0].delayMaxMs, 500);
    assert.deepEqual(
      snap.endpoints[0].scenarios!.map((s) => [s.name, s.isActive, s.rules.length]),
      [
        ['wrong-password', false, 1],
        ['maintenance', true, 0],
      ]
    );
    assert.deepEqual(snap.endpoints[0].scenarios![0].rules[0], {
      source: 'body',
      field: 'password',
      operator: 'equals',
      value: 'wrong',
    });
  });

  test('restore brings back endpoints, random delay, scenarios and rules', async ({ assert }) => {
    const { owner, project } = await seed();
    const v1 = await VersionService.createVersion(project.id, owner.id, owner.name, 'v1');

    // Wreck the live state: delete everything.
    await Endpoint.query().where('project_id', project.id).delete();

    const res = await VersionService.restoreVersion(project.id, owner.id, v1.id);
    assert.equal(res.endpointCount, 1);
    assert.equal(res.scenarioCount, 2);

    const { endpoints, scenarios } = await liveState(project.id);
    assert.lengthOf(endpoints, 1);
    assert.equal(endpoints[0].delayMaxMs, 500);
    assert.deepEqual(
      scenarios.map((s) => [s.name, s.statusCode, s.isActive, s.priority]),
      [
        ['wrong-password', 401, false, 0],
        ['maintenance', 503, true, 1],
      ]
    );
    assert.lengthOf(scenarios[0].rules, 1);
    assert.equal(scenarios[0].rules[0].value, 'wrong');
  });

  test('restore first saves the current state as a backup version', async ({ assert }) => {
    const { owner, project } = await seed();
    const v1 = await VersionService.createVersion(project.id, owner.id, owner.name, 'empty');
    // v1 was taken with the seeded state; now add a scenario that v1 doesn't have.
    const [endpoint] = await Endpoint.query().where('project_id', project.id);
    await EndpointScenario.create({
      endpointId: endpoint.id,
      name: 'added-later',
      description: null,
      statusCode: 418,
      responseBody: null,
      responseHeaders: null,
      delayMs: null,
      delayMaxMs: null,
      isActive: false,
      priority: 5,
    });

    const res = await VersionService.restoreVersion(project.id, owner.id, v1.id);

    const backup = await VersionHistory.findOrFail(res.backupVersionId);
    assert.match(backup.message ?? '', /^Auto-saved before restoring "empty"/);
    const names = (backup.snapshot as VersionSnapshot).endpoints[0].scenarios!.map((s) => s.name);
    assert.includeMembers(names, ['added-later']);

    // …and the backup is itself restorable.
    await VersionService.restoreVersion(project.id, owner.id, backup.id);
    const { scenarios } = await liveState(project.id);
    assert.includeMembers(
      scenarios.map((s) => s.name),
      ['added-later']
    );
  });

  test('a legacy snapshot (no scenarios) restores endpoints; the backup keeps the scenarios', async ({
    assert,
  }) => {
    const { owner, project } = await seed();
    const legacy = await VersionHistory.create({
      projectId: project.id,
      createdBy: owner.id,
      message: 'old format',
      snapshot: {
        project: {
          name: 'P',
          slug: project.slug,
          basePath: '/',
          isPublic: true,
          settings: { cors: true, log_requests: false },
        },
        endpoints: [
          {
            method: 'GET',
            path: '/old',
            statusCode: 200,
            responseBody: { old: true },
            responseHeaders: {},
            delayMs: 0,
            isActive: true,
          },
        ],
      },
    });

    const res = await VersionService.restoreVersion(project.id, owner.id, legacy.id);

    const { endpoints, scenarios } = await liveState(project.id);
    assert.deepEqual(
      endpoints.map((e) => [e.path, e.delayMaxMs]),
      [['/old', null]]
    );
    assert.lengthOf(scenarios, 0);

    const backup = await VersionHistory.findOrFail(res.backupVersionId);
    assert.lengthOf((backup.snapshot as VersionSnapshot).endpoints[0].scenarios!, 2);
  });
});
