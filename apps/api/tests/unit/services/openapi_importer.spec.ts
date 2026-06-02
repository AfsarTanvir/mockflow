import { test } from '@japa/runner';
import { parseOpenApiSpec } from '#app/services/openapi_importer';

function spec(paths: Record<string, unknown>): Record<string, unknown> {
  return { openapi: '3.0.3', info: { title: 'Test', version: '1.0.0' }, paths };
}

function isOk(
  result: ReturnType<typeof parseOpenApiSpec>
): result is { endpoints: any[]; warnings: string[] } {
  return !('error' in result);
}

test.group('openapi_importer — validation', () => {
  test('rejects non-object input', ({ assert }) => {
    const result = parseOpenApiSpec('not an object');
    assert.isTrue('error' in result);
  });

  test('rejects array input', ({ assert }) => {
    const result = parseOpenApiSpec([]);
    assert.isTrue('error' in result);
  });

  test('rejects null input', ({ assert }) => {
    const result = parseOpenApiSpec(null);
    assert.isTrue('error' in result);
  });

  test('rejects spec without openapi field', ({ assert }) => {
    const result = parseOpenApiSpec({ paths: {} });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /3\.x/);
  });

  test('rejects OpenAPI 2.x (swagger field instead)', ({ assert }) => {
    const result = parseOpenApiSpec({ swagger: '2.0', paths: {} });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /3\.x/);
  });

  test('rejects OpenAPI 4.x (not yet supported)', ({ assert }) => {
    const result = parseOpenApiSpec({ openapi: '4.0.0', paths: {} });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /3\.x/);
  });

  test('rejects spec missing paths object', ({ assert }) => {
    const result = parseOpenApiSpec({ openapi: '3.0.3' });
    if (isOk(result)) return assert.fail('expected error');
    assert.match(result.error, /paths/);
  });

  test('accepts a valid 3.0.x spec with empty paths', ({ assert }) => {
    const result = parseOpenApiSpec(spec({}));
    assert.isTrue(isOk(result));
    if (isOk(result)) {
      assert.deepEqual(result.endpoints, []);
      assert.deepEqual(result.warnings, []);
    }
  });
});

test.group('openapi_importer — path & method parsing', () => {
  test('converts {id} → :id in path', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/users/{id}': { get: { responses: { '200': {} } } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/users/:id');
  });

  test('converts multiple {param} segments', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({ '/orgs/{orgId}/members/{userId}': { get: { responses: { '200': {} } } } })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].path, '/orgs/:orgId/members/:userId');
  });

  test('uppercases method', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/users': { post: { responses: {} } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].method, 'POST');
  });

  test('captures every operation under one path', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/users/{id}': {
          get: { responses: {} },
          put: { responses: {} },
          delete: { responses: {} },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 3);
    assert.deepEqual(result.endpoints.map((e) => e.method).sort(), ['DELETE', 'GET', 'PUT']);
  });

  test('skips unknown operation keys (parameters, summary, etc.)', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/users': {
          summary: 'a description',
          parameters: [],
          get: { responses: {} },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.lengthOf(result.endpoints, 1);
    assert.equal(result.endpoints[0].method, 'GET');
  });
});

test.group('openapi_importer — response code selection', () => {
  test('picks first 2xx code over non-2xx codes', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': { get: { responses: { '404': {}, '201': {}, '500': {} } } },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 201);
  });

  test('falls back to 200 when no 2xx code is present', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/x': { get: { responses: { '500': {} } } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 200);
  });

  test('defaults to 200 when operation has no responses', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/x': { get: {} } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].statusCode, 200);
  });
});

test.group('openapi_importer — body parsing', () => {
  test('extracts example from content.application/json', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': {
          get: {
            responses: {
              '200': { content: { 'application/json': { example: { id: 1 } } } },
            },
          },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseBody, { id: 1 });
  });

  test('null responseBody when no example is present', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/x': { get: { responses: { '200': {} } } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.isNull(result.endpoints[0].responseBody);
  });

  test('wraps array example under { data }', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': {
          get: {
            responses: { '200': { content: { 'application/json': { example: [1, 2, 3] } } } },
          },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseBody, { data: [1, 2, 3] });
  });

  test('emits warning and nulls body when response uses $ref', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': {
          get: {
            responses: { '200': { $ref: '#/components/responses/Default' } },
          },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.isNull(result.endpoints[0].responseBody);
    assert.lengthOf(result.warnings, 1);
    assert.match(result.warnings[0], /\$ref/);
  });
});

test.group('openapi_importer — headers + extensions', () => {
  test('extracts response headers (example value only)', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': {
          get: {
            responses: {
              '200': {
                headers: {
                  'X-Request-Id': { schema: { type: 'string' }, example: 'abc123' },
                },
              },
            },
          },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseHeaders, { 'X-Request-Id': 'abc123' });
  });

  test('drops headers whose example is not a string', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({
        '/x': {
          get: {
            responses: {
              '200': { headers: { 'X-Count': { schema: { type: 'integer' }, example: 42 } } },
            },
          },
        },
      })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.deepEqual(result.endpoints[0].responseHeaders, {});
  });

  test('reads x-mockflow-delay-ms extension', ({ assert }) => {
    const result = parseOpenApiSpec(
      spec({ '/x': { get: { responses: {}, 'x-mockflow-delay-ms': 250 } } })
    );
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].delayMs, 250);
  });

  test('defaults delayMs to 0 when extension is missing', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/x': { get: { responses: {} } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.equal(result.endpoints[0].delayMs, 0);
  });

  test('newly-imported endpoints are active by default', ({ assert }) => {
    const result = parseOpenApiSpec(spec({ '/x': { get: { responses: {} } } }));
    if (!isOk(result)) return assert.fail('expected ok');
    assert.isTrue(result.endpoints[0].isActive);
  });
});
