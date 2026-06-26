import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Project from '#models/project';
import TeamMember from '#models/team_member';
import * as AccessService from '#services/access_service';

/**
 * Core legacy-project authorization primitive. Every project/endpoint/scenario/
 * rule controller funnels through resolveProjectRole, so a regression here
 * silently grants or denies access app-wide.
 */
test.group('access_service.resolveProjectRole (personal projects)', (group) => {
  // Each test runs in a transaction that is rolled back afterwards.
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  async function makeUser() {
    n += 1;
    return User.create({
      name: `User ${n}`,
      email: `u${n}-${Date.now()}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
  }

  function makeProject(ownerId: string) {
    return Project.create({
      name: 'P',
      slug: `p-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      basePath: '/',
      ownerId,
      isPublic: false,
      settings: { cors: true, log_requests: false, global_headers: {} },
    });
  }

  test('owner of a project resolves to "owner"', async ({ assert }) => {
    const owner = await makeUser();
    const project = await makeProject(owner.id);
    assert.equal(await AccessService.resolveProjectRole(project, owner.id), 'owner');
  });

  test('a stranger resolves to null (no access)', async ({ assert }) => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const project = await makeProject(owner.id);
    assert.isNull(await AccessService.resolveProjectRole(project, stranger.id));
  });

  test('a per-project team_member resolves to its role', async ({ assert }) => {
    const owner = await makeUser();
    const collaborator = await makeUser();
    const project = await makeProject(owner.id);
    await TeamMember.create({
      projectId: project.id,
      userId: collaborator.id,
      role: 'member',
      invitedAt: DateTime.now(),
    });
    assert.equal(await AccessService.resolveProjectRole(project, collaborator.id), 'member');
  });

  test('assertProjectAccess throws 403 when role is below the minimum', async ({ assert }) => {
    const owner = await makeUser();
    const viewer = await makeUser();
    const project = await makeProject(owner.id);
    await TeamMember.create({
      projectId: project.id,
      userId: viewer.id,
      role: 'viewer',
      invitedAt: DateTime.now(),
    });
    await assert.rejects(
      () => AccessService.assertProjectAccess(project.id, viewer.id, 'admin'),
      /permission|forbidden|access/i
    );
  });

  test('assertProjectAccess throws 404 for a missing project', async ({ assert }) => {
    const user = await makeUser();
    await assert.rejects(() =>
      AccessService.assertProjectAccess('00000000-0000-0000-0000-000000000000', user.id, 'viewer')
    );
  });
});
