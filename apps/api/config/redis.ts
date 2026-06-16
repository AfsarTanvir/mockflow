import env from '#start/env';
import { defineConfig } from '@adonisjs/redis';
import { InferConnections } from '@adonisjs/redis/types';

/**
 * Redis is used purely as a cache (see #services/cache_service). We intentionally
 * do NOT set ioredis `keyPrefix` here: the cache service owns a single
 * `mockflow:cache:` root prefix and applies it manually, because ioredis does
 * not prepend keyPrefix to SCAN's MATCH pattern but DOES to DEL/UNLINK — which
 * double-prefixes when you scan-then-delete. Owning the prefix keeps scan +
 * prefix-delete (section clears, flush-all) correct and predictable.
 */
const redisConfig = defineConfig({
  connection: 'main',

  connections: {
    main: {
      host: env.get('REDIS_HOST', '127.0.0.1'),
      port: env.get('REDIS_PORT', 6379),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: '',
      // Fail fast when Redis is unreachable so the cache degrades to "miss"
      // instead of hanging the request: don't queue commands while offline, and
      // give up a command after one retry. The cache service catches the error
      // and falls back to Postgres.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      // Bound reconnect attempts so a missing Redis degrades to "no cache"
      // instead of hammering forever.
      retryStrategy(times) {
        return times > 10 ? null : Math.min(times * 50, 2000);
      },
    },
  },
});

export default redisConfig;

declare module '@adonisjs/redis/types' {
  export interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
