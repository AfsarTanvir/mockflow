import { test } from '@japa/runner';
import { hasEmailTransport, getFromAddress } from '#app/services/email_service';

/**
 * Both helpers read from process.env. Each test snapshots and restores the
 * relevant env vars so tests don't leak into each other.
 */
const ENV_KEYS = ['MAILTRAP_TOKEN', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const snap: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

function clearEnv(): void {
  for (const k of ENV_KEYS) delete process.env[k];
}

test.group('email_service / hasEmailTransport', (group) => {
  let snap: Record<string, string | undefined>;
  group.each.setup(() => {
    snap = snapshotEnv();
    clearEnv();
    return () => restoreEnv(snap);
  });

  test('returns false when no credentials are set', ({ assert }) => {
    assert.isFalse(hasEmailTransport());
  });

  test('returns true when MAILTRAP_TOKEN is set', ({ assert }) => {
    process.env.MAILTRAP_TOKEN = 'some-token';
    assert.isTrue(hasEmailTransport());
  });

  test('returns true when both SMTP_USER and SMTP_PASS are set', ({ assert }) => {
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    assert.isTrue(hasEmailTransport());
  });

  test('returns false when only SMTP_USER is set (no pass)', ({ assert }) => {
    process.env.SMTP_USER = 'user';
    assert.isFalse(hasEmailTransport());
  });

  test('returns false when only SMTP_PASS is set (no user)', ({ assert }) => {
    process.env.SMTP_PASS = 'pass';
    assert.isFalse(hasEmailTransport());
  });

  test('returns true when MAILTRAP_TOKEN is set even without SMTP creds', ({ assert }) => {
    process.env.MAILTRAP_TOKEN = 'token';
    assert.isFalse(!!process.env.SMTP_USER);
    assert.isTrue(hasEmailTransport());
  });

  test('returns true when both Mailtrap and SMTP are set', ({ assert }) => {
    process.env.MAILTRAP_TOKEN = 'token';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    assert.isTrue(hasEmailTransport());
  });
});

test.group('email_service / getFromAddress', (group) => {
  let snap: Record<string, string | undefined>;
  group.each.setup(() => {
    snap = snapshotEnv();
    clearEnv();
    return () => restoreEnv(snap);
  });

  test('falls back to default name + email when SMTP_FROM is unset', ({ assert }) => {
    const from = getFromAddress();
    assert.equal(from.name, 'MockFlow');
    assert.equal(from.address, 'hello@demomailtrap.co');
  });

  test('parses "Name <email>" format', ({ assert }) => {
    process.env.SMTP_FROM = 'MockFlow <hello@example.com>';
    const from = getFromAddress();
    assert.equal(from.name, 'MockFlow');
    assert.equal(from.address, 'hello@example.com');
  });

  test('parses quoted name in "Name <email>" format', ({ assert }) => {
    process.env.SMTP_FROM = '"My App" <noreply@example.com>';
    const from = getFromAddress();
    assert.equal(from.name, 'My App');
    assert.equal(from.address, 'noreply@example.com');
  });

  test('falls back to default name when only address provided', ({ assert }) => {
    process.env.SMTP_FROM = 'plain@example.com';
    const from = getFromAddress();
    assert.equal(from.name, 'MockFlow');
    assert.equal(from.address, 'plain@example.com');
  });

  test('trims whitespace around name and address', ({ assert }) => {
    process.env.SMTP_FROM = '   Spaces   <  hello@example.com  >  ';
    const from = getFromAddress();
    assert.equal(from.name, 'Spaces');
    assert.equal(from.address, 'hello@example.com');
  });
});
