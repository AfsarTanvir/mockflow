import * as cache from '#services/cache_service';
import { isCacheSection, type CacheSection } from '#services/cache_keys';

/**
 * Read/aggregate/clear helpers for the admin Cache console. Thin orchestration
 * over the inspection primitives in #services/cache_service — all of which are
 * prefix-scoped to `mockflow:cache:`, so the admin can never touch keys outside
 * the cache namespace.
 */

export interface CacheListOpts {
  section?: CacheSection;
  search?: string;
  page?: number;
  perPage?: number;
}

/** Metrics + per-section breakdown for the console header. */
export async function overview() {
  const [connected, sections, hits] = await Promise.all([
    cache.isConnected(),
    cache.sectionStats(),
    cache.hitStats(),
  ]);
  return {
    connected,
    totalKeys: sections.reduce((sum, s) => sum + s.keys, 0),
    totalMemory: sections.reduce((sum, s) => sum + s.memory, 0),
    hitRate: hits.rate,
    hits: hits.hits,
    misses: hits.misses,
    sections,
  };
}

/** Paginated key browser (key + ttl + type + size), filtered by section/search. */
export async function listKeys(opts: CacheListOpts) {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;

  const { keys, truncated } = await cache.scanAll(opts.section ? `${opts.section}:` : '');
  const filtered = (opts.search ? keys.filter((k) => k.includes(opts.search!)) : keys).sort();

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const slice = filtered.slice((page - 1) * perPage, page * perPage);
  const data = await Promise.all(
    slice.map(async (key) => {
      const info = await cache.keyInfo(key);
      return { key, ttl: info.ttl, type: info.type, size: info.size };
    })
  );

  return {
    data,
    meta: { total, perPage, currentPage: page, lastPage, hasMore: page < lastPage, truncated },
  };
}

/** A single key's metadata + (truncated) value for the viewer drawer. */
export async function getEntry(key: string) {
  const [info, value] = await Promise.all([cache.keyInfo(key), cache.valuePreview(key)]);
  return { key, ttl: info.ttl, type: info.type, size: info.size, value };
}

export async function deleteKey(key: string): Promise<void> {
  await cache.del(key);
}

/** Clear one registered section (returns keys removed). Throws on unknown section. */
export async function deleteSection(section: string): Promise<number> {
  if (!isCacheSection(section)) {
    throw new Error(`Unknown cache section "${section}"`);
  }
  return cache.delByPrefix(`${section}:`);
}

export async function flushAll(): Promise<number> {
  return cache.flushAll();
}
