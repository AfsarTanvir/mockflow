import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteCacheKey,
  deleteCacheSection,
  flushCache,
  getCacheEntry,
  getCacheKeys,
  getCacheOverview,
  getCacheScopeKeys,
  purgeCacheScope,
} from '@/services/admin/cache';
import { QueryKey } from '@/types/query-key.enum';
import type { CacheKeyListParams, CacheScope } from '@/types/admin';

const STALE = 10 * 1000;

export const useAdminCacheOverview = () =>
  useQuery({
    queryKey: [QueryKey.ADMIN_CACHE_OVERVIEW],
    queryFn: getCacheOverview,
    staleTime: STALE,
  });

export const useAdminCacheKeys = (params: CacheKeyListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_CACHE_KEYS, params],
    queryFn: () => getCacheKeys(params),
    staleTime: STALE,
  });

export const useAdminCacheEntry = (key: string | null) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_CACHE_ENTRY, key],
    queryFn: () => getCacheEntry(key as string),
    enabled: !!key,
    staleTime: STALE,
  });

/** All mutations refresh the overview + the key browser (both mounted on the page). */
function useCacheInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_CACHE_OVERVIEW] });
    qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_CACHE_KEYS] });
  };
}

export const useAdminDeleteCacheKey = () => {
  const invalidate = useCacheInvalidate();
  return useMutation({ mutationFn: (key: string) => deleteCacheKey(key), onSuccess: invalidate });
};

export const useAdminDeleteCacheSection = () => {
  const invalidate = useCacheInvalidate();
  return useMutation({
    mutationFn: (section: string) => deleteCacheSection(section),
    onSuccess: invalidate,
  });
};

/** Look up what's cached for a scope. Disabled until an id is given. */
export const useAdminCacheScopeKeys = (scope: CacheScope, id: string | null) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_CACHE_SCOPE, scope, id],
    queryFn: () => getCacheScopeKeys(scope, id as string),
    enabled: !!id,
    staleTime: 0,
  });

export const useAdminPurgeCacheScope = () => {
  const qc = useQueryClient();
  const invalidate = useCacheInvalidate();
  return useMutation({
    mutationFn: ({ scope, id }: { scope: CacheScope; id: string }) => purgeCacheScope(scope, id),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_CACHE_SCOPE] });
    },
  });
};

export const useAdminFlushCache = () => {
  const invalidate = useCacheInvalidate();
  return useMutation({ mutationFn: () => flushCache(), onSuccess: invalidate });
};
