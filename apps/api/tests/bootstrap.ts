import type { ApplicationService } from '@adonisjs/core/types';
import { assert } from '@japa/assert';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import type { PluginFn, Config } from '@japa/runner/types';
import testUtils from '@adonisjs/core/services/test_utils';

/**
 * Japa plugins. `apiClient` is added back in Day 54–55 when integration
 * tests need it — keeping it out for unit tests avoids loading superagent.
 */
export function plugins(app: ApplicationService): PluginFn[] {
  return [assert(), pluginAdonisJS(app)];
}

/**
 * Runner-level hooks. Empty for now — per-test DB transaction wrapping
 * happens at the group level inside individual spec files (see integration
 * specs from Day 54–55).
 */
export const runnerHooks = {
  setup: [] as Array<() => void | Promise<void>>,
  teardown: [] as Array<() => void | Promise<void>>,
};

/**
 * The integration suite needs a real Postgres. Before it runs: refuse anything
 * that isn't a *_test database, create it if missing, and apply migrations.
 * (Each spec still wraps its tests in a rolled-back global transaction.)
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (suite.name === 'integration') {
    suite.setup(async () => {
      const { ensureTestDatabase } = await import('./helpers/test_database.js');
      await ensureTestDatabase();
      await testUtils.db().migrate();
    });
  }
};
