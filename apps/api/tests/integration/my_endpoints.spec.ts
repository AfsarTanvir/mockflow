import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import * as ProjectService from '#services/project_service';
import * as EndpointService from '#services/endpoint_service';

/** GET /api/endpoints: the endpoints of the user's own (personal) projects only. */
test.group('endpoints across my projects', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  const makeUser = () => {
    const id = `${Date.now()}-${(n += 1)}`;
    return User.create({
      name: `U ${id}`,
      email: `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
  };

  test('lists every endpoint of my projects, with its project, newest first', async ({
    assert,
  }) => {
    const me = await makeUser();
    const a = await ProjectService.createProject(me.id, { name: 'Alpha' });
    const b = await ProjectService.createProject(me.id, { name: 'Beta' });
    await EndpointService.createEndpoint(a.id, me.id, { method: 'GET', path: '/a' });
    await new Promise((r) => setTimeout(r, 5));
    await EndpointService.createEndpoint(b.id, me.id, { method: 'POST', path: '/b' });

    const list = await EndpointService.listForUser(me.id);
    assert.deepEqual(
      list.map((e) => [e.path, e.project.name]),
      [
        ['/b', 'Beta'],
        ['/a', 'Alpha'],
      ]
    );
    assert.equal(list[0].project.userRole, 'owner');
  });

  test("doesn't include other people's endpoints", async ({ assert }) => {
    const me = await makeUser();
    const other = await makeUser();
    const theirs = await ProjectService.createProject(other.id, { name: 'Theirs' });
    await EndpointService.createEndpoint(theirs.id, other.id, { method: 'GET', path: '/x' });

    assert.deepEqual(await EndpointService.listForUser(me.id), []);
  });
});
