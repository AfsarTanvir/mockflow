import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import { Exception } from '@adonisjs/core/exceptions';

interface ThrottleOptions {
  /** Max requests allowed per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal in-memory fixed-window rate limiter for unauthenticated routes
 * (brute-force / credential-stuffing / mail-flood defense on the auth
 * endpoints). Keyed by client IP + method + route.
 *
 * NOTE: state is per-process, so this protects a single instance and resets on
 * restart. For a multi-instance deployment, swap this for @adonisjs/limiter
 * backed by Redis. It is intentionally dependency-free so it works today.
 */
export default class ThrottleMiddleware {
  private static buckets = new Map<string, Bucket>();
  private static lastSweep = 0;

  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    const { max, windowMs } = options;
    const now = Date.now();
    const key = `${ctx.request.ip()}:${ctx.request.method()}:${ctx.request.url()}`;

    ThrottleMiddleware.sweep(now);

    let bucket = ThrottleMiddleware.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      ThrottleMiddleware.buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      ctx.response.header('Retry-After', String(retryAfter));
      throw new Exception('Too many requests. Please try again later.', {
        status: 429,
        code: 'E_TOO_MANY_REQUESTS',
      });
    }

    return next();
  }

  /** Periodically drop expired buckets so the map can't grow unbounded. */
  private static sweep(now: number) {
    if (now - ThrottleMiddleware.lastSweep < 60_000) return;
    ThrottleMiddleware.lastSweep = now;
    for (const [k, b] of ThrottleMiddleware.buckets) {
      if (b.resetAt <= now) ThrottleMiddleware.buckets.delete(k);
    }
  }
}
