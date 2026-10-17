# API tests

```bash
cd apps/api
node --import tsx/esm bin/test.ts            # all suites
node --import tsx/esm bin/test.ts integration # just integration
```

- **unit** (`tests/unit`) — pure-function service tests, no DB.
- **integration** (`tests/integration`) — boot the app and exercise services against
  Postgres. Each test runs inside a global transaction that is rolled back
  (`testUtils.db().withGlobalTransaction()`). Cache specs flush Redis around each test
  (Redis isn't transactional) and warm the connection once.

## Isolation from dev data

`bin/test.ts` sets `NODE_ENV=test`, so Adonis layers **`.env.test`** over `.env`:

| Setting        | Test value             | Effect                                                                                                  |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `DB_DATABASE`  | `mockflow_test`        | Separate database. Created (if the DB user may) and migrated automatically before the integration suite |
| `CACHE_PREFIX` | `mockflow:test:cache:` | Separate cache namespace — `flushAll()` in a spec can't touch dev keys                                  |

The integration suite **refuses to start** unless the database name ends in `_test`.

If your Postgres user can't create databases (e.g. a native install where `mockflow`
lacks `CREATEDB`), create it once as a superuser:

```bash
sudo -u postgres createdb -O mockflow mockflow_test   # native Postgres
# Docker Postgres needs nothing: its POSTGRES_USER is a superuser
```

Personal overrides go in `.env.test.local` (gitignored).

Requires Postgres and, for the cache specs, Redis (`docker compose up -d redis`).

## Install caveat (Japa ↔ @adonisjs/core resolution)

The runner needs `@japa/plugin-adonisjs` (and friends) to resolve `@adonisjs/core`.
npm's workspace hoisting can place the Japa packages in the repo-root `node_modules`
while `@adonisjs/core` stays in `apps/api/node_modules`, breaking resolution at
bootstrap (the same quirk that affects `@adonisjs/redis`). If you see
_"Cannot find package '@adonisjs/core' … from …/@japa/plugin-adonisjs"_, ensure the
`@japa/*` packages live under `apps/api/node_modules` (a clean reinstall, or moving the
`@japa` scope there, resolves it). A repo-level fix is an `.npmrc` with a nested
install strategy.
