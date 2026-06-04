import { test } from '@japa/runner';
import type { HttpContext } from '@adonisjs/core/http';
import type ScenarioRule from '#app/models/scenario_rule';
import { evalRule, getByPath } from '#app/services/scenario_resolver';

/**
 * Build a minimal request stub matching the surface area scenario_resolver uses.
 * The real AdonisJS request has dozens of methods; we only need .header, .qs, .body.
 * Headers are stored case-insensitively to mirror AdonisJS behaviour.
 */
function makeRequest(opts: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}): HttpContext['request'] {
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers ?? {})) {
    lowerHeaders[k.toLowerCase()] = v;
  }

  return {
    header: (name: string) => lowerHeaders[name.toLowerCase()],
    qs: () => opts.query ?? {},
    body: () => opts.body ?? {},
  } as unknown as HttpContext['request'];
}

function makeRule(partial: Partial<ScenarioRule>): ScenarioRule {
  return {
    source: 'header',
    field: 'x',
    operator: 'equals',
    value: null,
    ...partial,
  } as ScenarioRule;
}

test.group('scenario_resolver / getByPath', () => {
  test('returns top-level value', ({ assert }) => {
    assert.equal(getByPath({ name: 'alice' }, 'name'), 'alice');
  });

  test('walks one level of nesting', ({ assert }) => {
    assert.equal(getByPath({ user: { email: 'a@b.com' } }, 'user.email'), 'a@b.com');
  });

  test('walks two levels of nesting', ({ assert }) => {
    assert.equal(getByPath({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
  });

  test('returns undefined when a segment is missing', ({ assert }) => {
    assert.isUndefined(getByPath({ user: {} }, 'user.email'));
  });

  test('returns undefined when walking through null', ({ assert }) => {
    assert.isUndefined(getByPath({ user: null }, 'user.email'));
  });

  test('returns undefined when walking through a primitive', ({ assert }) => {
    assert.isUndefined(getByPath({ user: 'string' }, 'user.email'));
  });

  test('returns undefined when given a null root', ({ assert }) => {
    assert.isUndefined(getByPath(null, 'anything'));
  });
});

test.group('scenario_resolver / evalRule — header source', () => {
  test('equals — matches when header value is identical', ({ assert }) => {
    const rule = makeRule({
      source: 'header',
      field: 'Authorization',
      operator: 'equals',
      value: 'Bearer abc',
    });
    const req = makeRequest({ headers: { Authorization: 'Bearer abc' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('equals — does not match when header value differs', ({ assert }) => {
    const rule = makeRule({
      source: 'header',
      field: 'X-Role',
      operator: 'equals',
      value: 'admin',
    });
    const req = makeRequest({ headers: { 'X-Role': 'user' } });
    assert.isFalse(evalRule(rule, req));
  });

  test('equals — header lookup is case-insensitive', ({ assert }) => {
    const rule = makeRule({
      source: 'header',
      field: 'authorization',
      operator: 'equals',
      value: 'Bearer abc',
    });
    const req = makeRequest({ headers: { Authorization: 'Bearer abc' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('exists — true when header is present with any value', ({ assert }) => {
    const rule = makeRule({ source: 'header', field: 'Authorization', operator: 'exists' });
    const req = makeRequest({ headers: { Authorization: 'anything' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('exists — false when header is missing', ({ assert }) => {
    const rule = makeRule({ source: 'header', field: 'X-Missing', operator: 'exists' });
    const req = makeRequest({ headers: {} });
    assert.isFalse(evalRule(rule, req));
  });
});

test.group('scenario_resolver / evalRule — query source', () => {
  test('equals — matches on query param value', ({ assert }) => {
    const rule = makeRule({ source: 'query', field: 'role', operator: 'equals', value: 'admin' });
    const req = makeRequest({ query: { role: 'admin' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('exists — true when query param is present', ({ assert }) => {
    const rule = makeRule({ source: 'query', field: 'debug', operator: 'exists' });
    const req = makeRequest({ query: { debug: '1' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('exists — false when query param is missing', ({ assert }) => {
    const rule = makeRule({ source: 'query', field: 'debug', operator: 'exists' });
    const req = makeRequest({ query: {} });
    assert.isFalse(evalRule(rule, req));
  });
});

test.group('scenario_resolver / evalRule — body source', () => {
  test('equals — matches on top-level body field', ({ assert }) => {
    const rule = makeRule({
      source: 'body',
      field: 'password',
      operator: 'equals',
      value: 'wrong',
    });
    const req = makeRequest({ body: { password: 'wrong' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('equals — matches on dot-notation body path', ({ assert }) => {
    const rule = makeRule({
      source: 'body',
      field: 'user.email',
      operator: 'equals',
      value: 'a@b.com',
    });
    const req = makeRequest({ body: { user: { email: 'a@b.com' } } });
    assert.isTrue(evalRule(rule, req));
  });

  test('equals — does not match when nested path is missing', ({ assert }) => {
    const rule = makeRule({
      source: 'body',
      field: 'user.email',
      operator: 'equals',
      value: 'a@b.com',
    });
    const req = makeRequest({ body: { user: {} } });
    assert.isFalse(evalRule(rule, req));
  });

  test('exists — true when body field is present and non-empty', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'token', operator: 'exists' });
    const req = makeRequest({ body: { token: 'abc' } });
    assert.isTrue(evalRule(rule, req));
  });

  test('exists — false when body field is empty string', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'token', operator: 'exists' });
    const req = makeRequest({ body: { token: '' } });
    assert.isFalse(evalRule(rule, req));
  });

  test('exists — false when body field is null', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'token', operator: 'exists' });
    const req = makeRequest({ body: { token: null } });
    assert.isFalse(evalRule(rule, req));
  });
});

test.group('scenario_resolver / evalRule — equals coercion', () => {
  test('equals — coerces numeric value to string for comparison', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'age', operator: 'equals', value: '18' });
    const req = makeRequest({ body: { age: 18 } });
    assert.isTrue(evalRule(rule, req));
  });

  test('equals — coerces boolean value to string for comparison', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'active', operator: 'equals', value: 'true' });
    const req = makeRequest({ body: { active: true } });
    assert.isTrue(evalRule(rule, req));
  });

  test('equals — null value field never matches', ({ assert }) => {
    const rule = makeRule({ source: 'body', field: 'token', operator: 'equals', value: '' });
    const req = makeRequest({ body: { token: null } });
    assert.isFalse(evalRule(rule, req));
  });
});
