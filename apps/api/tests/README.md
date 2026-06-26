# API tests

```bash
cd apps/api
node --import tsx/esm bin/test.ts            # all suites
node --import tsx/esm bin/test.ts integration # just integration
```

- **unit** (`tests/unit`) — pure-function service tests, no DB.
- **integration** (`tests/integration`) — boot the app and exercise services against
  Postgres. Each test runs inside a global transaction that is rolled back
  (`testUtils.db().withGlobalTransaction()`), so they're safe to run against the dev
  DB and leave no residue. Cache specs also flush Redis around each test (Redis isn't
  transactional) and warm the connection once so the first op doesn't race the connect.

Requires Postgres (migrated) and, for the cache specs, Redis (`docker compose up -d redis`).

## Install caveat (Japa ↔ @adonisjs/core resolution)

The runner needs `@japa/plugin-adonisjs` (and friends) to resolve `@adonisjs/core`.
npm's workspace hoisting can place the Japa packages in the repo-root `node_modules`
while `@adonisjs/core` stays in `apps/api/node_modules`, breaking resolution at
bootstrap (the same quirk that affects `@adonisjs/redis`). If you see
_"Cannot find package '@adonisjs/core' … from …/@japa/plugin-adonisjs"_, ensure the
`@japa/*` packages live under `apps/api/node_modules` (a clean reinstall, or moving the
`@japa` scope there, resolves it). A repo-level fix is an `.npmrc` with a nested
install strategy.
