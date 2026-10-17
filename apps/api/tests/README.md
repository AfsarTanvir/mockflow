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

## Install note: `@adonisjs/core` must be hoisted

`@adonisjs/redis`, `@adonisjs/cors` and `@japa/plugin-adonisjs` sit in the repo-root
`node_modules` and peer-depend on `@adonisjs/core`, so core has to be there too. npm
only puts it there when every peer of core is satisfied: notably `@vinejs/vine` must be
`^4` (Lucid 22 also wants `^3 || ^4`). With VineJS 2, npm nested core under
`apps/api/node_modules`, and `node ace …`, migrations and this test runner failed at
boot with _"Cannot find package '@adonisjs/core' imported from …/node_modules/…"_.

If that error comes back after a dependency change, look for a new peer conflict:
`npm explain @adonisjs/core` and `npm ls --all | grep invalid`. Don't run
`npm audit fix --force` here: in this workspace it "fixes" advisories by jumping to
unrelated majors (e.g. `@adonisjs/assembler` 5 for an Adonis 7 app).
