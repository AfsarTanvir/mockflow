import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVersions, getVersion, createVersion, restoreVersion } from '@/services/versions';
import { QueryKey } from '@/types/query-key.enum';
import type { ProjectVersion } from '@/types';

export const useVersions = (projectId: string) => {
  return useQuery({
    queryKey: [QueryKey.VERSIONS, projectId],
    queryFn: () => getVersions(projectId),
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
      queryClient.setQueryData<ProjectVersion[]>(
        [QueryKey.VERSIONS, projectId],
        (old) => (old ? [newVersion, ...old] : [newVersion])
      );
    },
  });
};

export const useRestoreVersion = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => restoreVersion(projectId, versionId),
    onSuccess: () => {
      // Invalidate endpoints and project so the UI reflects restored state
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENDPOINTS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT, projectId] });
    },
  });
};
