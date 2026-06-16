import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteCacheKey,
  deleteCacheSection,
  flushCache,
  getCacheEntry,
  getCacheKeys,
  getCacheOverview,
} from '@/services/admin/cache';
import { QueryKey } from '@/types/query-key.enum';
import type { CacheKeyListParams } from '@/types/admin';

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

export const useAdminFlushCache = () => {
  const invalidate = useCacheInvalidate();
  return useMutation({ mutationFn: () => flushCache(), onSuccess: invalidate });
};
