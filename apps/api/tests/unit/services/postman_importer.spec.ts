import { test } from '@japa/runner';
import { parsePostmanCollection } from '#app/services/postman_importer';

const SCHEMA_V21 = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function collection(items: unknown[]): Record<string, unknown> {
  return {
    info: { name: 'Test', schema: SCHEMA_V21 },
    item: items,
  };
}

function leaf(opts: {
  method?: string;
  url?: unknown;
  response?: unknown[];
  name?: string;
}): Record<string, unknown> {
  return {
    name: opts.name ?? 'X',
    request: {
      method: opts.method ?? 'GET',
      url: opts.url ?? { raw: '{{baseUrl}}/users', host: ['{{baseUrl}}'], path: ['users'] },
    },
    response: opts.response,
  };
}

function isOk(
  result: ReturnType<typeof parsePostmanCollection>
): result is { endpoints: any[]; warnings: string[] } {
  return !('error' in result);
}

test.group('postman_importer — validation', () => {
  test('rejects non-object input', ({ assert }) => {
    assert.isTrue('error' in parsePostmanCollection('not an object'));
  });

  test('rejects array input', ({ assert }) => {
    assert.isTrue('error' in parsePostmanCollection([]));
  });

  test('rejects collection missing info.schema', ({ assert }) => {
    const result = parsePostmanCollection({ info: { name: 'x' }, item: [] });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /v2\.1\.0/);
  });

  test('rejects v2.0.0 schema', ({ assert }) => {
    const result = parsePostmanCollection({
      info: { name: 'x', schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json' },
      item: [],
    });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /v2\.1\.0/);
  });

  test('rejects collection without item array', ({ assert }) => {
    const result = parsePostmanCollection({ info: { name: 'x', schema: SCHEMA_V21 } });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /item/);
  });

  test('accepts empty collection', ({ assert }) => {
    const result = parsePostmanCollection(collection([]));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints, []);
  });
});

test.group('postman_importer — URL parsing', () => {
  test('strips {{baseUrl}} prefix from url.raw', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        leaf({ url: { raw: '{{baseUrl}}/users', host: ['{{baseUrl}}'], path: ['users'] } }),
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/users');
  });

  test('strips {{anyVar}} prefix (not just baseUrl)', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        leaf({ url: { raw: '{{server}}/users/:id', host: ['{{server}}'], path: ['users', ':id'] } }),
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/users/:id');
  });

  test('keeps :param segments as colon-notation', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ url: { raw: '{{baseUrl}}/users/:id' } })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/users/:id');
  });

  test('converts remaining {{var}} mid-path to :var', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ url: { raw: '{{baseUrl}}/orgs/{{orgId}}/users/{{userId}}' } })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/orgs/:orgId/users/:userId');
  });

  test('falls back to "/" when url is empty', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ url: { raw: '{{baseUrl}}' } })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/');
  });

  test('accepts url.raw as a plain string', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ url: '{{baseUrl}}/health' })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/health');
  });
});

test.group('postman_importer — response parsing', () => {
  test('uses 200 default when no response array', ({ assert }) => {
    const result = parsePostmanCollection(collection([leaf({})]));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 200);
  });

  test('uses 200 default when response array is empty', ({ assert }) => {
    const result = parsePostmanCollection(collection([leaf({ response: [] })]));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 200);
  });

  test('reads numeric code from first response', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ code: 404, body: '' }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 404);
  });

  test('falls back to status string when code missing', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ status: '201', body: '' }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 201);
  });

  test('parses stringified JSON body to object', ({ assert }) => {
    const body = { id: 1, name: 'alice' };
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ code: 200, body: JSON.stringify(body) }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseBody, body);
  });

  test('wraps stringified array body under { data }', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ code: 200, body: '[1,2,3]' }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseBody, { data: [1, 2, 3] });
  });

  test('wraps non-JSON body string under { raw }', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ code: 200, body: 'plain text not json' }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseBody, { raw: 'plain text not json' });
  });

  test('returns null when body is empty string', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ response: [{ code: 200, body: '' }] })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.isNull(result.endpoints[0].responseBody);
  });

  test('parses response.header[] into a {key:value} map', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        leaf({
          response: [
            {
              code: 200,
              body: '',
              header: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'X-Request-Id', value: 'abc' },
              ],
            },
          ],
        }),
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseHeaders, {
      'Content-Type': 'application/json',
      'X-Request-Id': 'abc',
    });
  });
});

test.group('postman_importer — folder walking', () => {
  test('walks one level of nested folder', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        {
          name: 'Users',
          item: [leaf({ method: 'GET', url: { raw: '{{baseUrl}}/users' } })],
        },
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 1);
    assert.equal(result.endpoints[0].path, '/users');
  });

  test('walks deeply nested folders', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        {
          name: 'Users',
          item: [
            {
              name: 'Admin',
              item: [leaf({ method: 'DELETE', url: { raw: '{{baseUrl}}/users/:id' } })],
            },
          ],
        },
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 1);
    assert.equal(result.endpoints[0].method, 'DELETE');
    assert.equal(result.endpoints[0].path, '/users/:id');
  });

  test('mixes folders and leaves at the same level', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        leaf({ method: 'GET', url: { raw: '{{baseUrl}}/health' } }),
        {
          name: 'Users',
          item: [leaf({ method: 'POST', url: { raw: '{{baseUrl}}/users' } })],
        },
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 2);
    assert.deepEqual(
      result.endpoints.map((e) => `${e.method} ${e.path}`).sort(),
      ['GET /health', 'POST /users']
    );
  });
});

test.group('postman_importer — method handling', () => {
  test('uppercases method', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([leaf({ method: 'post' })])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].method, 'POST');
  });

  test('emits warning and drops unsupported methods (OPTIONS, HEAD, etc.)', ({ assert }) => {
    const result = parsePostmanCollection(
      collection([
        leaf({ method: 'OPTIONS', url: { raw: '{{baseUrl}}/x' } }),
        leaf({ method: 'GET', url: { raw: '{{baseUrl}}/y' } }),
      ])
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 1);
    assert.equal(result.endpoints[0].method, 'GET');
    assert.lengthOf(result.warnings, 1);
    assert.match(result.warnings[0], /OPTIONS/);
  });
});
