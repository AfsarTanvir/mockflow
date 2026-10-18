import { test } from '@japa/runner';
import router from '@adonisjs/core/services/router';
import { buildDocument } from '#services/api_docs_service';

type Doc = { paths: Record<string, Record<string, Record<string, any>>> };

/** /api/docs.json is generated from the routes, their middleware and validators. */
test.group('API docs', (group) => {
  // The HTTP server commits the router at startup; tests run without one.
  group.setup(() => router.commit());

  test('lists the routes with summaries', async ({ assert }) => {
    const doc = (await buildDocument()) as Doc;
    assert.equal(doc.paths['/api/projects']?.get?.summary, 'List projects');
    assert.equal(doc.paths['/api/auth/login']?.post?.summary, 'Login');
  });

  test('marks routes behind the auth middleware with the bearer lock', async ({ assert }) => {
    const doc = (await buildDocument()) as Doc;
    assert.deepEqual(doc.paths['/api/projects'].get.security, [{ bearer: [] }]);
    assert.notExists(doc.paths['/api/auth/login'].post.security?.[0]);
  });

  test('takes request bodies and query params from the VineJS validators', async ({ assert }) => {
    const doc = (await buildDocument()) as Doc;
    const body = doc.paths['/api/auth/login'].post.requestBody.content['application/json'].schema;
    assert.includeMembers(Object.keys(body.properties), ['email', 'password']);

    const query = doc.paths['/api/admin/users'].get.parameters.filter((p: any) => p.in === 'query');
    assert.includeMembers(
      query.map((p: any) => p.name),
      ['page', 'perPage']
    );
  });
});
