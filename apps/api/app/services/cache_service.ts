import redis from '@adonisjs/redis/services/main';
import logger from '@adonisjs/core/services/logger';
import { DateTime } from 'luxon';
import env from '#start/env';
import { cacheKeys, CACHE_SECTIONS, type CacheSection } from '#services/cache_keys';

/**
 * Redis cache (cache-aside) with mandatory graceful degradation: if Redis is
 * unavailable or disabled, every operation behaves as a miss / no-op so callers
 * fall back to Postgres. The mock endpoint must never 500 because of the cache.
 *
 * This module owns the single `mockflow:cache:` root prefix (see config/redis.ts
 * for why ioredis keyPrefix is left empty). Callers pass LOGICAL keys built via
 * #services/cache_keys; we prepend/strip the root prefix here.
 */

const ROOT = 'mockflow:cache:';
const ENABLED = env.get('CACHE_ENABLED') !== false; // default true when unset
export const CACHE_TTL = {
  mock: env.get('CACHE_TTL_MOCK', 300),
  entity: env.get('CACHE_TTL_ENTITY', 600),
};
const SCAN_COUNT = 500;
// Don't cache values larger than this (e.g. a pathologically large mock
// blueprint): they bloat Redis and cost CPU to JSON.parse on every hit.
const MAX_VALUE_BYTES = 512 * 1024;
// Marks a cached "not found" so unknown lookups (e.g. bad/guessed slugs) don't
// hit Postgres on every request. A bare token can never equal a JSON value.
const NEGATIVE_SENTINEL = '__cache_miss__';

const full = (key: string) => ROOT + key;
const strip = (fullKey: string) =>
  fullKey.startsWith(ROOT) ? fullKey.slice(ROOT.length) : fullKey;

// Log the first failure after a healthy period, and the recovery — avoids
// flooding logs while Redis is down.
let degraded = false;
function onError(op: string, err: unknown): void {
  if (!degraded) {
    degraded = true;
    logger.warn({ err }, `[cache] Redis error during "${op}" — serving from DB until it recovers`);
  }
}
function onOk(): void {
  if (degraded) {
    degraded = false;
    logger.info('[cache] Redis recovered — caching resumed');
  }
}

/** ±10% TTL jitter so values written together don't all expire at once (stampede waves). */
function jitter(ttlSeconds: number): number {
  return Math.max(1, Math.round(ttlSeconds * (0.9 + Math.random() * 0.2)));
}

const oversizeWarned = new Set<string>();
/** Best-effort SET with jittered TTL, skipping values over the size cap. */
async function writeCache(key: string, serialized: string, ttlSeconds: number): Promise<void> {
  if (serialized.length > MAX_VALUE_BYTES) {
    if (!oversizeWarned.has(key)) {
      oversizeWarned.add(key);
      logger.warn(
        `[cache] not caching "${key}": ${serialized.length}B exceeds ${MAX_VALUE_BYTES}B cap`
      );
    }
    return;
  }
  try {
    await redis.setex(full(key), jitter(ttlSeconds), serialized);
    onOk();
  } catch (err) {
    onError('setex', err);
  }
}

async function bumpStat(kind: 'hits' | 'misses'): Promise<void> {
  if (!ENABLED) return;
  try {
    const key = full(`stats:${kind}:${DateTime.now().toFormat('yyyyLLdd')}`);
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 60 * 60 * 48); // keep ~2 days for the 24h rate
  } catch {
    /* metrics are best-effort; never affect the request */
  }
}

/* ----------------------------------------------------------------- */
/* Core cache-aside                                                  */
/* ----------------------------------------------------------------- */

// In-process single-flight: concurrent misses for the same key share ONE loader
// run (+ one setex), so an expired/invalidated hot key can't stampede Postgres.
// Per-process by design; entries are removed as soon as the load settles.
const inflight = new Map<string, Promise<unknown>>();

/**
 * Cache-aside read: return cached JSON on hit, else run `loader`, cache, return.
 * Pass `negativeTtl` to briefly cache "not found" (loader → null/undefined) so
 * unknown lookups don't hit the DB on every request.
 */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  opts?: { negativeTtl?: number }
): Promise<T> {
  if (!ENABLED) return loader();

  try {
    const cached = await redis.get(full(key));
    if (cached !== null) {
      onOk();
      void bumpStat('hits');
      // Negative hit: we previously cached "not found" for this key.
      return cached === NEGATIVE_SENTINEL ? (null as T) : (JSON.parse(cached) as T);
    }
  } catch (err) {
    onError('get', err);
    return loader();
  }

  void bumpStat('misses');

  // Coalesce concurrent misses for this key onto a single in-flight load.
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const load = (async () => {
    try {
      const value = await loader();
      if (value !== null && value !== undefined) {
        await writeCache(key, JSON.stringify(value), ttlSeconds);
      } else if (opts?.negativeTtl) {
        await writeCache(key, NEGATIVE_SENTINEL, opts.negativeTtl);
      }
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, load);
  return load as Promise<T>;
}

export async function get<T>(key: string): Promise<T | null> {
  if (!ENABLED) return null;
  try {
    const v = await redis.get(full(key));
    onOk();
    return v === null ? null : (JSON.parse(v) as T);
  } catch (err) {
    onError('get', err);
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!ENABLED || value === null || value === undefined) return;
  await writeCache(key, JSON.stringify(value), ttlSeconds);
}

/** Delete one or more logical keys (non-blocking UNLINK). */
export async function del(...keys: string[]): Promise<void> {
  if (!ENABLED || keys.length === 0) return;
  try {
    await redis.unlink(...keys.map(full));
    onOk();
  } catch (err) {
    onError('unlink', err);
  }
}

/** Delete every key under a logical prefix via SCAN + UNLINK (never KEYS). */
export async function delByPrefix(logicalPrefix: string): Promise<number> {
  if (!ENABLED) return 0;
  let deleted = 0;
  try {
    const pattern = `${full(logicalPrefix)}*`;
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_COUNT);
      cursor = next;
      if (batch.length) {
        await redis.unlink(...batch); // batch keys are already fully-prefixed
        deleted += batch.length;
      }
    } while (cursor !== '0');
    onOk();
  } catch (err) {
    onError('delByPrefix', err);
  }
  return deleted;
}

/** Flush the entire cache namespace (only keys under the root prefix). */
export async function flushAll(): Promise<number> {
  return delByPrefix('');
}

/* ----------------------------------------------------------------- */
/* Inspection (admin Cache console)                                  */
/* ----------------------------------------------------------------- */

export async function isConnected(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/** All logical keys under a prefix (capped, with a `truncated` flag). */
export async function scanAll(
  logicalPrefix = '',
  cap = 10_000
): Promise<{ keys: string[]; truncated: boolean }> {
  const keys: string[] = [];
  let truncated = false;
  if (!ENABLED) return { keys, truncated };
  try {
    const pattern = `${full(logicalPrefix)}*`;
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_COUNT);
      cursor = next;
      for (const k of batch) {
        if (keys.length >= cap) {
          truncated = true;
          break;
        }
        keys.push(strip(k));
      }
    } while (cursor !== '0' && !truncated);
    onOk();
  } catch (err) {
    onError('scan', err);
  }
  return { keys, truncated };
}

/** TTL (seconds, -1 = no expiry, -2 = missing), value type, and memory size (bytes). */
export async function keyInfo(key: string): Promise<{ ttl: number; type: string; size: number }> {
  const fk = full(key);
  try {
    const [ttlMs, type] = await Promise.all([redis.pttl(fk), redis.type(fk)]);
    let size = 0;
    try {
      size = Number(await redis.memory('USAGE', fk)) || 0;
    } catch {
      /* MEMORY USAGE may be unavailable; size stays 0 */
    }
    const ttl = ttlMs >= 0 ? Math.round(ttlMs / 1000) : ttlMs;
    return { ttl, type: String(type), size };
  } catch (err) {
    onError('keyInfo', err);
    return { ttl: -2, type: 'unknown', size: 0 };
  }
}

/** Raw stored value (string), truncated to `maxBytes`. */
export async function valuePreview(key: string, maxBytes = 64 * 1024): Promise<string | null> {
  try {
    const type = await redis.type(full(key));
    if (type !== 'string') return `[${type} value — not previewable]`;
    const v = await redis.get(full(key));
    if (v === null) return null;
    return v.length > maxBytes
      ? `${v.slice(0, maxBytes)}… (truncated; ${v.length} bytes total)`
      : v;
  } catch (err) {
    onError('valuePreview', err);
    return null;
  }
}

/** Per-section key counts + memory (SCAN aggregate over each registered section). */
export async function sectionStats(): Promise<
  { name: CacheSection; keys: number; memory: number }[]
> {
  const out: { name: CacheSection; keys: number; memory: number }[] = [];
  for (const section of CACHE_SECTIONS) {
    const { keys } = await scanAll(`${section}:`);
    let memory = 0;
    for (const k of keys) memory += (await keyInfo(k)).size;
    out.push({ name: section, keys: keys.length, memory });
  }
  return out;
}

/** Hit/miss counters over today + yesterday (≈24h) and the resulting hit rate. */
export async function hitStats(): Promise<{ hits: number; misses: number; rate: number }> {
  if (!ENABLED) return { hits: 0, misses: 0, rate: 0 };
  try {
    const now = DateTime.now();
    const days = [now, now.minus({ days: 1 })].map((d) => d.toFormat('yyyyLLdd'));
    let hits = 0;
    let misses = 0;
    for (const d of days) {
      hits += Number((await redis.get(full(`stats:hits:${d}`))) ?? 0);
      misses += Number((await redis.get(full(`stats:misses:${d}`))) ?? 0);
    }
    const total = hits + misses;
    return { hits, misses, rate: total ? hits / total : 0 };
  } catch (err) {
    onError('hitStats', err);
    return { hits: 0, misses: 0, rate: 0 };
  }
}

/* ----------------------------------------------------------------- */
/* Domain invalidation (called from service mutations)              */
/* ----------------------------------------------------------------- */

/** A project's endpoints/scenarios/rules changed → drop its mock blueprint. */
export async function invalidateMock(projectId: string): Promise<void> {
  await del(cacheKeys.mockBlueprint(projectId));
}

/** Project deleted → drop blueprint, slug mapping and entity cache. */
export async function invalidateProjectFull(projectId: string, slug: string): Promise<void> {
  await del(
    cacheKeys.mockBlueprint(projectId),
    cacheKeys.mockSlug(slug),
    cacheKeys.project(projectId)
  );
}

export async function invalidateProjectEntity(projectId: string): Promise<void> {
  await del(cacheKeys.project(projectId));
}

export async function invalidateCompany(slug: string): Promise<void> {
  await del(cacheKeys.company(slug));
}

export async function invalidateTeam(teamId: string): Promise<void> {
  await del(cacheKeys.team(teamId));
}

export async function invalidateProfile(profileId: string): Promise<void> {
  await del(cacheKeys.profile(profileId));
}
