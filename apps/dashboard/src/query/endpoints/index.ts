import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEndpoints,
  getMyEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  toggleEndpoint,
} from '@/services/endpoints';
import { QueryKey } from '@/types/query-key.enum';
import type { Endpoint } from '@/types';

export const useEndpoints = (projectId: string) => {
  return useQuery({
    queryKey: [QueryKey.ENDPOINTS, projectId],
    queryFn: () => getEndpoints(projectId),
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
  });
};

export const useMyEndpoints = () => {
  return useQuery({
    queryKey: [QueryKey.MY_ENDPOINTS],
    queryFn: getMyEndpoints,
    staleTime: 30 * 1000,
  });
};

type CreatePayload = Parameters<typeof createEndpoint>[1];
type UpdatePayload = Parameters<typeof updateEndpoint>[1];

export const useCreateEndpoint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePayload) => createEndpoint(projectId, body),
    onSuccess: (endpoint) => {
      queryClient.setQueryData<Endpoint[]>([QueryKey.ENDPOINTS, projectId], (old = []) => [
        ...old,
        endpoint,
      ]);
      // A new, more specific endpoint can take over a scheduled call's path.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_ENDPOINTS] });
    },
  });
};

export const useUpdateEndpoint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UpdatePayload) => updateEndpoint(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<Endpoint[]>([QueryKey.ENDPOINTS, projectId], (old = []) =>
        old.map((e) => (e.id === updated.id ? updated : e))
      );
      // Which endpoint serves a scheduled call can change with any endpoint edit.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_ENDPOINTS] });
    },
  });
};

export const useDeleteEndpoint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEndpoint(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Endpoint[]>([QueryKey.ENDPOINTS, projectId], (old = []) =>
        old.filter((e) => e.id !== id)
      );
      // Which endpoint serves a scheduled call can change with any endpoint edit.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_ENDPOINTS] });
    },
  });
};

export const useToggleEndpoint = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleEndpoint(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Endpoint[]>([QueryKey.ENDPOINTS, projectId], (old = []) =>
        old.map((e) => (e.id === updated.id ? updated : e))
      );
      // Which endpoint serves a scheduled call can change with any endpoint edit.
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_ENDPOINTS] });
    },
  });
};
