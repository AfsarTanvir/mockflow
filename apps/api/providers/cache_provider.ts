import type { ApplicationService } from '@adonisjs/core/types';

/**
 * Logs Redis cache availability once at boot so it's obvious in the logs whether
 * the app is running with caching or degraded to DB-only. Never throws — a
 * missing Redis must not block startup (the cache service degrades gracefully).
 */
export default class CacheProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() !== 'web') return;
    try {
      const env = (await import('#start/env')).default;
      const logger = (await import('@adonisjs/core/services/logger')).default;
      if (env.get('CACHE_ENABLED') === false) {
        logger.info('[cache] CACHE_ENABLED=false — caching disabled (DB only)');
        return;
      }
      const { isConnected } = await import('#services/cache_service');
      if (await isConnected()) {
        logger.info('[cache] Redis connected — caching enabled');
      } else {
        logger.warn('[cache] Redis unavailable — running without cache (DB only)');
      }
    } catch {
      /* best-effort boot diagnostic only */
    }
  }
}
