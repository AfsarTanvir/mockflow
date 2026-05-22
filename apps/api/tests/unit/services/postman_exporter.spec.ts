import { test } from '@japa/runner';
import { buildPostmanCollection } from '#app/services/postman_exporter';

type EndpointData = {
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
};

const PROJECT = { name: 'Test Project', slug: 'test-project', basePath: '/' };

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

test.group('postman_exporter — collection shape', () => {
  test('emits v2.1 schema in info', ({ assert }) => {
    const doc = buildPostmanCollection(PROJECT, [], 'http://x', false);
    const info = doc.info as { name: string; schema: string };
    assert.equal(info.name, 'Test Project');
    assert.match(info.schema, /v2\.1\.0/);
  });

  test('declares a baseUrl variable derived from apiUrl + slug', ({ assert }) => {
    const doc = buildPostmanCollection(PROJECT, [], 'http://localhost:3000', false);
    const vars = doc.variable as Array<{ key: string; value: string; type: string }>;
    assert.lengthOf(vars, 1);
    assert.equal(vars[0].key, 'baseUrl');
    assert.equal(vars[0].value, 'http://localhost:3000/mock/test-project');
    assert.equal(vars[0].type, 'string');
  });

  test('appends basePath to baseUrl when not /', ({ assert }) => {
    const doc = buildPostmanCollection(
      { ...PROJECT, basePath: '/v1' },
      [],
      'http://localhost:3000',
      false
    );
    const vars = doc.variable as Array<{ value: string }>;
    assert.equal(vars[0].value, 'http://localhost:3000/mock/test-project/v1');
  });

  test('empty endpoint list produces empty items array', ({ assert }) => {
    const doc = buildPostmanCollection(PROJECT, [], 'http://x', false);
    assert.deepEqual(doc.item, []);
  });
});

test.group('postman_exporter — item building', () => {
  test('item.name is "METHOD path"', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ method: 'POST', path: '/users' })],
      'http://x',
      false
    );
    const items = doc.item as Array<{ name: string }>;
    assert.equal(items[0].name, 'POST /users');
  });

  test('builds url.raw with {{baseUrl}} prefix', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ path: '/users/:id' })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    assert.equal(items[0].request.url.raw, '{{baseUrl}}/users/:id');
  });

  test('splits the path into segments under url.path', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ path: '/users/:id/posts' })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    assert.deepEqual(items[0].request.url.path, ['users', ':id', 'posts']);
  });

  test('url.host is ["{{baseUrl}}"]', ({ assert }) => {
    const doc = buildPostmanCollection(PROJECT, [endpoint({})], 'http://x', false);
    const items = doc.item as any[];
    assert.deepEqual(items[0].request.url.host, ['{{baseUrl}}']);
  });

  test('request.method matches endpoint method', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ method: 'PATCH' })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    assert.equal(items[0].request.method, 'PATCH');
  });
});

test.group('postman_exporter — response building', () => {
  test('response body is stringified JSON', ({ assert }) => {
    const body = { id: 1, name: 'alice' };
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ responseBody: body })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    const responseBody = items[0].response[0].body;
    assert.isString(responseBody);
    assert.deepEqual(JSON.parse(responseBody), body);
  });

  test('response code is numeric, status is string', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ statusCode: 404 })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    assert.equal(items[0].response[0].code, 404);
    assert.equal(items[0].response[0].status, '404');
  });

  test('headers serialized as key/value array', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [
        endpoint({
          responseHeaders: { 'X-Request-Id': 'abc', 'Content-Type': 'application/json' },
        }),
      ],
      'http://x',
      false
    );
    const items = doc.item as any[];
    const headers = items[0].response[0].header as Array<{ key: string; value: string }>;
    assert.lengthOf(headers, 2);
    assert.deepInclude(headers, { key: 'X-Request-Id', value: 'abc' });
    assert.deepInclude(headers, { key: 'Content-Type', value: 'application/json' });
  });

  test('empty body when responseBody is null', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ responseBody: null })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    assert.equal(items[0].response[0].body, '');
  });
});

test.group('postman_exporter — sorting & filtering', () => {
  test('skips inactive endpoints', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ path: '/a' }), endpoint({ path: '/b', isActive: false })],
      'http://x',
      false
    );
    const items = doc.item as Array<{ name: string }>;
    assert.lengthOf(items, 1);
    assert.equal(items[0].name, 'GET /a');
  });

  test('items sorted alphabetically by path', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [
        endpoint({ path: '/zebra' }),
        endpoint({ path: '/apple' }),
        endpoint({ path: '/mango' }),
      ],
      'http://x',
      false
    );
    const items = doc.item as Array<{ name: string }>;
    assert.deepEqual(
      items.map((i) => i.name),
      ['GET /apple', 'GET /mango', 'GET /zebra']
    );
  });

  test('same path sorted by method order GET → POST → PUT → PATCH → DELETE', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [
        endpoint({ method: 'DELETE', path: '/x' }),
        endpoint({ method: 'GET', path: '/x' }),
        endpoint({ method: 'PUT', path: '/x' }),
        endpoint({ method: 'POST', path: '/x' }),
      ],
      'http://x',
      false
    );
    const items = doc.item as Array<{ name: string }>;
    assert.deepEqual(
      items.map((i) => i.name),
      ['GET /x', 'POST /x', 'PUT /x', 'DELETE /x']
    );
  });
});

test.group('postman_exporter — evaluation', () => {
  test('raw mode keeps faker template literally', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ responseBody: { name: '{{faker.person.fullName()}}' } })],
      'http://x',
      false
    );
    const items = doc.item as any[];
    const parsed = JSON.parse(items[0].response[0].body);
    assert.equal(parsed.name, '{{faker.person.fullName()}}');
  });

  test('evaluated mode resolves faker to real value', ({ assert }) => {
    const doc = buildPostmanCollection(
      PROJECT,
      [endpoint({ responseBody: { name: '{{faker.person.fullName()}}' } })],
      'http://x',
      true
    );
    const items = doc.item as any[];
    const parsed = JSON.parse(items[0].response[0].body);
    assert.notMatch(parsed.name, /\{\{faker/);
    assert.isTrue(parsed.name.length > 0);
  });
});
