import { test } from '@japa/runner';
import { buildOpenApiDoc } from '#app/services/openapi_exporter';

type EndpointData = {
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
};

const PROJECT = {
  id: 'proj-uuid',
  name: 'Test Project',
  slug: 'test-project',
  basePath: '/',
};

function endpoint(partial: Partial<EndpointData>): EndpointData {
  return {
    method: 'GET',
    path: '/users',
    statusCode: 200,
    responseBody: { ok: true },
    responseHeaders: {},
    delayMs: 0,
    isActive: true,
    ...partial,
  };
}

test.group('openapi_exporter — top-level shape', () => {
  test('emits openapi 3.0.3 envelope with project name as title', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [], 'http://localhost:3000', false);
    assert.equal(doc.openapi, '3.0.3');
    const info = doc.info as Record<string, unknown>;
    assert.equal(info.title, 'Test Project');
    assert.equal(info['x-mockflow-project-id'], 'proj-uuid');
  });

  test('emits an empty paths object when project has zero endpoints', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [], 'http://localhost:3000', false);
    assert.deepEqual(doc.paths, {});
  });

  test('builds server URL from apiUrl + slug when basePath is /', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [], 'http://localhost:3000', false);
    const servers = doc.servers as Array<{ url: string }>;
    assert.equal(servers[0].url, 'http://localhost:3000/mock/test-project');
  });

  test('appends basePath to server URL when basePath is not /', ({ assert }) => {
    const doc = buildOpenApiDoc(
      { ...PROJECT, basePath: '/v1' },
      [],
      'http://localhost:3000',
      false
    );
    const servers = doc.servers as Array<{ url: string }>;
    assert.equal(servers[0].url, 'http://localhost:3000/mock/test-project/v1');
  });
});

test.group('openapi_exporter — path & operation building', () => {
  test('converts :param to {param} in path keys', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ path: '/users/:id' })], 'http://x', false);
    const paths = doc.paths as Record<string, unknown>;
    assert.property(paths, '/users/{id}');
    assert.notProperty(paths, '/users/:id');
  });

  test('lowercases the HTTP method as the operation key', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ method: 'POST' })], 'http://x', false);
    const paths = doc.paths as Record<string, Record<string, unknown>>;
    assert.property(paths['/users'], 'post');
  });

  test('groups multiple methods under the same path', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [
        endpoint({ method: 'GET', path: '/users/:id' }),
        endpoint({ method: 'DELETE', path: '/users/:id' }),
      ],
      'http://x',
      false
    );
    const paths = doc.paths as Record<string, Record<string, unknown>>;
    assert.properties(paths['/users/{id}'], ['get', 'delete']);
  });

  test('auto-generates a parameters block from path params', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [endpoint({ path: '/orgs/:orgId/members/:userId' })],
      'http://x',
      false
    );
    const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;
    const op = paths['/orgs/{orgId}/members/{userId}'].get;
    const params = op.parameters as Array<{ in: string; name: string; required: boolean }>;
    assert.lengthOf(params, 2);
    assert.deepEqual(
      params.map((p) => p.name),
      ['orgId', 'userId']
    );
    assert.isTrue(params.every((p) => p.in === 'path' && p.required === true));
  });

  test('does not emit a parameters block when path has no params', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ path: '/health' })], 'http://x', false);
    const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;
    assert.notProperty(paths['/health'].get, 'parameters');
  });

  test('emits x-mockflow-delay-ms extension', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ delayMs: 250 })], 'http://x', false);
    const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;
    assert.equal(paths['/users'].get['x-mockflow-delay-ms'], 250);
  });
});

test.group('openapi_exporter — response body & null handling', () => {
  test('omits content block entirely when responseBody is null', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ responseBody: null })], 'http://x', false);
    const paths = doc.paths as Record<
      string,
      Record<string, Record<string, Record<string, Record<string, unknown>>>>
    >;
    const response = paths['/users'].get.responses['200'];
    assert.notProperty(response, 'content');
  });

  test('embeds responseBody under content.application/json.example', ({ assert }) => {
    const body = { id: 1, name: 'alice' };
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ responseBody: body })], 'http://x', false);
    const example = (doc.paths as any)['/users'].get.responses['200'].content['application/json']
      .example;
    assert.deepEqual(example, body);
  });

  test('omits headers block when responseHeaders is empty', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ responseHeaders: {} })], 'http://x', false);
    const paths = doc.paths as Record<
      string,
      Record<string, Record<string, Record<string, Record<string, unknown>>>>
    >;
    assert.notProperty(paths['/users'].get.responses['200'], 'headers');
  });

  test('emits headers block with schema/example for each header', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [endpoint({ responseHeaders: { 'X-Request-Id': 'abc123' } })],
      'http://x',
      false
    );
    const paths = doc.paths as Record<
      string,
      Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>
    >;
    const headers = paths['/users'].get.responses['200'].headers as Record<
      string,
      { schema: { type: string }; example: string }
    >;
    assert.deepEqual(headers['X-Request-Id'], { schema: { type: 'string' }, example: 'abc123' });
  });

  test('status code becomes string key in responses', ({ assert }) => {
    const doc = buildOpenApiDoc(PROJECT, [endpoint({ statusCode: 404 })], 'http://x', false);
    const paths = doc.paths as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;
    assert.property(paths['/users'].get.responses, '404');
  });
});

test.group('openapi_exporter — active filter & evaluation', () => {
  test('skips inactive endpoints', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [endpoint({ path: '/active' }), endpoint({ path: '/inactive', isActive: false })],
      'http://x',
      false
    );
    const paths = doc.paths as Record<string, unknown>;
    assert.property(paths, '/active');
    assert.notProperty(paths, '/inactive');
  });

  test('raw mode keeps faker templates as literal strings', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [endpoint({ responseBody: { name: '{{faker.person.fullName()}}' } })],
      'http://x',
      false
    );
    const example = (doc.paths as any)['/users'].get.responses['200'].content['application/json']
      .example;
    assert.equal(example.name, '{{faker.person.fullName()}}');
  });

  test('evaluated mode resolves faker templates to real values', ({ assert }) => {
    const doc = buildOpenApiDoc(
      PROJECT,
      [endpoint({ responseBody: { name: '{{faker.person.fullName()}}' } })],
      'http://x',
      true
    );
    const example = (doc.paths as any)['/users'].get.responses['200'].content['application/json']
      .example;
    assert.notMatch(example.name, /\{\{faker/);
    assert.isTrue(example.name.length > 0);
  });
});
