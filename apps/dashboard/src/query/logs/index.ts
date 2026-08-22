import { useInfiniteQuery } from '@tanstack/react-query';
import { getRequestLogs } from '@/services/logs';
import { QueryKey } from '@/types/query-key.enum';

const PAGE_SIZE = 50;

/**
 * A project's request logs, newest first. Cursor-paginated: pages accumulate
 * via `fetchNextPage()` rather than replacing each other, so the caller flattens
 * `data.pages` into one list.
 */
export const useRequestLogs = (projectId: string) => {
  return useInfiniteQuery({
    queryKey: [QueryKey.REQUEST_LOGS, projectId],
    queryFn: ({ pageParam }) =>
      getRequestLogs(projectId, { cursor: pageParam ?? undefined, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    staleTime: 30 * 1000,
    enabled: !!projectId,
  });
};
