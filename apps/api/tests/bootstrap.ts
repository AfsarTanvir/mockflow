import type { ApplicationService } from '@adonisjs/core/types';
import { assert } from '@japa/assert';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import type { PluginFn } from '@japa/runner/types';

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
