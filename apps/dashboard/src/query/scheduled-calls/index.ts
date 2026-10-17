import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getSchedulerStatus,
  getScheduledCalls,
  createScheduledCall,
  deleteScheduledCall,
  pauseScheduledCall,
  resumeScheduledCall,
  runScheduledCall,
  getScheduledCallRuns,
} from '@/services/scheduled-calls';
import {
  clearStoredStatus,
  msUntilExpiry,
  readStoredStatus,
  storeStatus,
} from '@/lib/scheduler-status';
import { QueryKey } from '@/types/query-key.enum';
import type { ScheduledCallInput } from '@/types';

/**
 * Can scheduling be offered? Answered from localStorage while the stored copy is
 * fresh (≤ 10 min, aligned with the server's Redis copy), so most page visits
 * make no request at all. Re-checked on mount / window focus once it expires.
 */
export const useSchedulerStatus = () => {
  return useQuery({
    queryKey: [QueryKey.SCHEDULER_STATUS],
    queryFn: async () => readStoredStatus() ?? storeStatus(await getSchedulerStatus()),
    staleTime: (query) => msUntilExpiry(query.state.data),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

/** Forget both cached answers and ask the server again (after a failed scheduler call). */
export function refreshSchedulerStatus(queryClient: QueryClient) {
  clearStoredStatus();
  return queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULER_STATUS] });
}

export const useScheduledCalls = (projectId: string, enabled = true) => {
  return useQuery({
    queryKey: [QueryKey.SCHEDULED_CALLS, projectId],
    queryFn: () => getScheduledCalls(projectId),
    enabled: !!projectId && enabled,
    staleTime: 10 * 1000,
    // Live state (next run, last result) changes on its own while the panel is open.
    refetchInterval: 30 * 1000,
  });
};

export const useScheduledCallRuns = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [QueryKey.SCHEDULED_CALL_RUNS, id],
    queryFn: () => getScheduledCallRuns(id),
    enabled: !!id && enabled,
    staleTime: 10 * 1000,
  });
};

/**
 * Shared mutation wiring: refresh the list either way (the call may have
 * changed state on the scheduler), and on failure re-check availability so the
 * Schedule option turns off if the scheduler just went away.
 */
function useScheduledCallMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<unknown>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] }),
    onError: () => refreshSchedulerStatus(queryClient),
  });
}

export const useCreateScheduledCall = (projectId: string) =>
  useScheduledCallMutation(projectId, (body: ScheduledCallInput) =>
    createScheduledCall(projectId, body)
  );

export const useDeleteScheduledCall = (projectId: string) =>
  useScheduledCallMutation(projectId, (id: string) => deleteScheduledCall(id));

export const usePauseScheduledCall = (projectId: string) =>
  useScheduledCallMutation(projectId, (id: string) => pauseScheduledCall(id));

export const useResumeScheduledCall = (projectId: string) =>
  useScheduledCallMutation(projectId, (id: string) => resumeScheduledCall(id));

export const useRunScheduledCall = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => runScheduledCall(id),
    onSuccess: (_data, id) => {
      // The run is asynchronous; give it a moment before showing the result.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALLS, projectId] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SCHEDULED_CALL_RUNS, id] });
      }, 1500);
    },
    onError: () => refreshSchedulerStatus(queryClient),
  });
};
