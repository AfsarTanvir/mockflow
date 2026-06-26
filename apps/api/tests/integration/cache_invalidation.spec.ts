import { test } from '@japa/runner';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Project from '#models/project';
import * as cache from '#services/cache_service';
import { cacheKeys } from '#services/cache_keys';
import * as endpointService from '#services/endpoint_service';
import type { CreateEndpointInput } from '#services/endpoint_service';

/**
 * The cache must stay in sync with writes: a project mutation drops its cached
 * mock blueprint so the next request rebuilds it. (Requires Redis running.)
 */
test.group('cache invalidation on writes', (group) => {
  // Warm the Redis connection once so the first cache op doesn't race the connect.
  group.setup(async () => {
    await cache.isConnected();
    await new Promise((r) => setTimeout(r, 150));
  });
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  // Redis isn't transactional — flush around each test for isolation.
  group.each.setup(async () => {
    await cache.flushAll();
    return async () => {
      await cache.flushAll();
    };
  });

  async function seedOwnedProject() {
    const owner = await User.create({
      name: 'Owner',
      email: `owner-${Date.now()}-${Math.round(Math.random() * 1e6)}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    const project = await Project.create({
      name: 'P',
      slug: `p-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      basePath: '/',
      ownerId: owner.id,
      isPublic: true,
      settings: { cors: true, log_requests: false, global_headers: {} },
    });
    return { owner, project };
  }

  function endpointInput(path: string): CreateEndpointInput {
    return {
      method: 'GET',
      path,
      statusCode: 200,
      responseBody: null,
      responseHeaders: {},
      delayMs: 0,
      delayMaxMs: null,
      isActive: true,
    };
  }

  test('creating an endpoint drops the cached blueprint', async ({ assert }) => {
    const { owner, project } = await seedOwnedProject();
    const key = cacheKeys.mockBlueprint(project.id);

    // warm the cache
    await cache.set(key, { isPublic: true, settings: {}, endpoints: [] }, 300);
    assert.isNotNull(await cache.get(key));

    // a real service mutation must invalidate it
    await endpointService.createEndpoint(project.id, owner.id, endpointInput('/ping'));

    assert.isNull(await cache.get(key));
  });

  test('toggling an endpoint drops the cached blueprint', async ({ assert }) => {
    const { owner, project } = await seedOwnedProject();
    const endpoint = await endpointService.createEndpoint(
      project.id,
      owner.id,
      endpointInput('/toggle-me')
    );

    const key = cacheKeys.mockBlueprint(project.id);
    await cache.set(key, { isPublic: true, settings: {}, endpoints: [] }, 300);
    assert.isNotNull(await cache.get(key));

    await endpointService.toggleEndpoint(endpoint.id, owner.id);
    assert.isNull(await cache.get(key));
  });
});
