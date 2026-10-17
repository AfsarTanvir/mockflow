import httpClient from '@/http-client';
import type {
  CacheEntry,
  CacheKeyList,
  CacheKeyListParams,
  CacheOverview,
  CacheScope,
  CacheScopeKeys,
  CacheScopePurgeResult,
} from '@/types/admin';

/** Super-admin Redis cache console API client (routes gated by superAdmin). */

export async function getCacheOverview(): Promise<CacheOverview> {
  const { data } = await httpClient.get<CacheOverview>('/api/admin/cache');
  return data;
}

export async function getCacheKeys(params: CacheKeyListParams): Promise<CacheKeyList> {
  const { data } = await httpClient.get<CacheKeyList>('/api/admin/cache/keys', { params });
  return data;
}

export async function getCacheEntry(key: string): Promise<CacheEntry> {
  const { data } = await httpClient.get<CacheEntry>('/api/admin/cache/entry', { params: { key } });
  return data;
}

export async function deleteCacheKey(key: string): Promise<void> {
  await httpClient.delete('/api/admin/cache/entry', { data: { key } });
}

export async function deleteCacheSection(section: string): Promise<void> {
  await httpClient.delete(`/api/admin/cache/section/${encodeURIComponent(section)}`);
}

/** Keys currently cached for one project / team / company. */
export async function getCacheScopeKeys(scope: CacheScope, id: string): Promise<CacheScopeKeys> {
  const { data } = await httpClient.get<CacheScopeKeys>(`/api/admin/cache/scope/${scope}/${id}`);
  return data;
}

/** Clear everything cached for one project / team / company. */
export async function purgeCacheScope(
  scope: CacheScope,
  id: string
): Promise<CacheScopePurgeResult> {
  const { data } = await httpClient.delete<CacheScopePurgeResult>(
    `/api/admin/cache/scope/${scope}/${id}`
  );
  return data;
}

export async function flushCache(): Promise<void> {
  await httpClient.delete('/api/admin/cache');
}
