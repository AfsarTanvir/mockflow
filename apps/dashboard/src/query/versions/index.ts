import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { getVersions, getVersion, createVersion, restoreVersion } from '@/services/versions';
import { QueryKey } from '@/types/query-key.enum';
import type { CursorPage, ProjectVersion } from '@/types';

const PAGE_SIZE = 25;

type VersionPages = InfiniteData<CursorPage<ProjectVersion>>;

/**
 * A project's snapshot history, newest first. Cursor-paginated: pages accumulate
 * via `fetchNextPage()`, so the caller flattens `data.pages` into one list.
 */
export const useVersions = (projectId: string) => {
  return useInfiniteQuery({
    queryKey: [QueryKey.VERSIONS, projectId],
    queryFn: ({ pageParam }) =>
      getVersions(projectId, { cursor: pageParam ?? undefined, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    staleTime: 30 * 1000,
    enabled: !!projectId,
  });
};

export const useVersion = (projectId: string, id: string) => {
  return useQuery({
    queryKey: [QueryKey.VERSION, projectId, id],
    queryFn: () => getVersion(projectId, id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
};

export const useCreateVersion = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string | null) => createVersion(projectId, message),
    onSuccess: (newVersion) => {
      // A new snapshot is the newest row, so it belongs at the head of the first
      // page. Cursors already handed out stay valid — they point further back.
      queryClient.setQueryData<VersionPages>([QueryKey.VERSIONS, projectId], (old) => {
        if (!old || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        return { ...old, pages: [{ ...first, data: [newVersion, ...first.data] }, ...rest] };
      });
    },
  });
};

export const useRestoreVersion = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreVersion(projectId, versionId),
    onSuccess: () => {
      // Restore rewrites the project, its endpoints and their scenarios/rules,
      // and adds an automatic "before restore" version to the history.
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENDPOINTS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.RULES] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.VERSIONS, projectId] });
    },
  });
};
