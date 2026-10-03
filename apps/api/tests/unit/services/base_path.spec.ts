import { test } from '@japa/runner';
import {
  BASE_PATH_RE,
  normalizeBasePath,
  storedBasePath,
  stripBasePath,
} from '#services/base_path';

test.group('base_path: normalizeBasePath / storedBasePath', () => {
  test('root forms normalize to empty string', ({ assert }) => {
    for (const v of ['/', '', '  ', '///', null, undefined]) {
      assert.equal(normalizeBasePath(v), '', String(v));
    }
  });

  test('strips trailing slashes and adds a missing leading slash', ({ assert }) => {
    assert.equal(normalizeBasePath('/v1/'), '/v1');
    assert.equal(normalizeBasePath('/api/v2//'), '/api/v2');
    assert.equal(normalizeBasePath('v1'), '/v1');
  });

  test('stored form is "/" for the root, canonical otherwise', ({ assert }) => {
    assert.equal(storedBasePath('/'), '/');
    assert.equal(storedBasePath(''), '/');
    assert.equal(storedBasePath('/v1/'), '/v1');
  });
});

test.group('base_path: stripBasePath', () => {
  test('root base path leaves the request path unchanged', ({ assert }) => {
    assert.equal(stripBasePath('/users/1', '/'), '/users/1');
    assert.equal(stripBasePath('/users/1', ''), '/users/1');
  });

  test('strips the prefix for paths under the base', ({ assert }) => {
    assert.equal(stripBasePath('/v1/users/1', '/v1'), '/users/1');
    assert.equal(stripBasePath('/api/v1/users', '/api/v1/'), '/users');
  });

  test('the base itself maps to "/"', ({ assert }) => {
    assert.equal(stripBasePath('/v1', '/v1'), '/');
    assert.equal(stripBasePath('/v1/', '/v1'), '/');
  });

  test('paths outside the base return null', ({ assert }) => {
    assert.isNull(stripBasePath('/users', '/v1'));
    assert.isNull(stripBasePath('/v10/users', '/v1'), 'prefix must end at a segment boundary');
    assert.isNull(stripBasePath('/', '/v1'));
  });

  test('matching is case-insensitive like endpoint matching', ({ assert }) => {
    assert.equal(stripBasePath('/V1/Users', '/v1'), '/Users');
  });
});

test.group('base_path: BASE_PATH_RE', () => {
  test('accepts literal paths', ({ assert }) => {
    for (const v of ['/', '/v1', '/api/v1.2', '/a-b_c~d/e']) assert.isTrue(BASE_PATH_RE.test(v), v);
  });

  test('rejects params, wildcards, spaces and query strings', ({ assert }) => {
    for (const v of ['/:id', '/files/*', '/a b', '/v1?x=1', 'v1']) {
      assert.isFalse(BASE_PATH_RE.test(v), v);
    }
  });
});
