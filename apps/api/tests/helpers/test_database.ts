import db from '@adonisjs/lucid/services/db';
import env from '#start/env';

const MAINTENANCE = 'postgres_test_maintenance';

/**
 * Integration tests write (inside rolled-back transactions) and flush their
 * cache namespace, so they must never point at a real database. bin/test.ts
 * sets NODE_ENV=test, which layers .env.test (DB_DATABASE=mockflow_test) over
 * .env — this guard catches anything that slips past that.
 */
export function assertTestDatabase(): string {
  const name = env.get('DB_DATABASE');
  if (!/^[a-z0-9_]+_test$/i.test(name)) {
    throw new Error(
      `Refusing to run integration tests against database "${name}". ` +
        'The test database name must end in "_test" (see apps/api/.env.test).'
    );
  }
  return name;
}

/**
 * Create the test database if it doesn't exist yet, so `npm run test:integration`
 * works on a fresh machine. Connects to the `postgres` maintenance database
 * with the same credentials, then closes that connection.
 */
export async function ensureTestDatabase(): Promise<void> {
  const name = assertTestDatabase();
  const base = db.getRawConnection('postgres')?.config;
  if (!base) throw new Error('Postgres connection "postgres" is not configured');

  db.manager.add(MAINTENANCE, {
    ...base,
    connection: { ...(base.connection as object), database: 'postgres' },
  } as typeof base);

  try {
    const result = await db
      .connection(MAINTENANCE)
      .rawQuery('SELECT 1 FROM pg_database WHERE datname = ?', [name]);
    if (result.rows.length === 0) {
      // `name` is validated by assertTestDatabase, so quoting it is safe.
      await db.connection(MAINTENANCE).rawQuery(`CREATE DATABASE "${name}"`);
    }
  } catch (error) {
    throw new Error(
      `Could not prepare test database "${name}": ${(error as Error).message}. ` +
        `Create it once by hand (e.g. createdb -O ${env.get('DB_USER')} ${name}) ` +
        'or give the DB user CREATEDB.'
    );
  } finally {
    await db.manager.close(MAINTENANCE);
  }
}
