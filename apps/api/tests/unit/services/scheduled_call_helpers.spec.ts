import { test } from '@japa/runner';
import {
  hasDotSegment,
  headersError,
  intervalToSchedule,
  jobName,
  parseJobName,
  requestPathMatches,
} from '#services/scheduled_call_service';

test.group('scheduled_call_service / intervalToSchedule', () => {
  test('uses the largest whole unit', ({ assert }) => {
    assert.equal(intervalToSchedule(60), '@every 1m');
    assert.equal(intervalToSchedule(600), '@every 10m');
    assert.equal(intervalToSchedule(3600), '@every 1h');
    assert.equal(intervalToSchedule(86_400), '@every 24h');
    assert.equal(intervalToSchedule(90), '@every 90s');
  });
});

test.group('scheduled_call_service / requestPathMatches', () => {
  test('fills params and ignores the query string', ({ assert }) => {
    assert.isTrue(requestPathMatches('/users/:id', '/users/42'));
    assert.isTrue(requestPathMatches('/users/:id', '/users/42?expand=1'));
    assert.isTrue(requestPathMatches('/ping', '/ping'));
  });

  test('rejects other paths', ({ assert }) => {
    assert.isFalse(requestPathMatches('/users/:id', '/users'));
    assert.isFalse(requestPathMatches('/users/:id', '/users/42/posts'));
    assert.isFalse(requestPathMatches('/ping', '/pong'));
  });

  test('a malformed escape is a mismatch, not a crash', ({ assert }) => {
    assert.isFalse(requestPathMatches('/users/:id', '/users/%E0%A4%A'));
  });
});

test.group('scheduled_call_service / hasDotSegment', () => {
  test('flags . and .. segments, plain or %-encoded', ({ assert }) => {
    assert.isTrue(hasDotSegment('/users/..'));
    assert.isTrue(hasDotSegment('/users/../../api/projects'));
    assert.isTrue(hasDotSegment('/users/%2e%2e'));
    assert.isTrue(hasDotSegment('/./users'));
  });

  test('allows dots inside a segment and in the query', ({ assert }) => {
    assert.isFalse(hasDotSegment('/files/report.v2.pdf'));
    assert.isFalse(hasDotSegment('/users/42?next=../x'));
    assert.isFalse(hasDotSegment('/users/...'));
  });
});

test.group('scheduled_call_service / headersError', () => {
  test('accepts ordinary headers', ({ assert }) => {
    assert.isNull(headersError({ 'X-Trace': 'abc', Accept: 'application/json' }));
  });

  test('rejects reserved, malformed and multi-line headers', ({ assert }) => {
    assert.isString(headersError({ 'x-mockflow-schedule': 'x' }));
    assert.isString(headersError({ Host: 'evil.test' }));
    assert.isString(headersError({ 'Bad Name': 'x' }));
    assert.isString(headersError({ 'X-A': 'one\r\nX-B: two' }));
  });

  test('rejects control characters but allows tabs', ({ assert }) => {
    assert.isString(headersError({ 'X-A': 'nul\u0000' }));
    assert.isString(headersError({ 'X-A': 'bell\u0007' }));
    assert.isString(headersError({ 'X-A': 'del\u007f' }));
    assert.isNull(headersError({ 'X-A': 'tab\tseparated' }));
    assert.isNull(headersError({ 'X-A': 'ünïcödé' }));
  });

  test('caps the number of headers', ({ assert }) => {
    const many = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`X-${i}`, 'v']));
    assert.isString(headersError(many));
  });
});

test.group('scheduled_call_service / job names', () => {
  test('round-trips our own ids', ({ assert }) => {
    const id = '0b6f1a5e-3c1d-4f7a-9e2b-6c8d0e1f2a3b';
    assert.equal(parseJobName(jobName(id)), id);
  });

  test("ignores anyone else's jobs", ({ assert }) => {
    assert.isNull(parseJobName('backup-database'));
    assert.isNull(parseJobName('mockflow:some-other-db:0b6f1a5e-3c1d-4f7a-9e2b-6c8d0e1f2a3b'));
    assert.isNull(parseJobName(jobName('not-a-uuid')));
  });
});
