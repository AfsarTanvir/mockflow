import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getScenarios,
  getScenario,
  createScenario,
  updateScenario,
  deleteScenario,
  activateScenario,
  deactivateAllScenarios,
} from '@/services/scenarios';
import { QueryKey } from '@/types/query-key.enum';
import type { ScenarioInput } from '@/types';

export const useScenarios = (endpointId: string) => {
  return useQuery({
    queryKey: [QueryKey.SCENARIOS, endpointId],
    queryFn: () => getScenarios(endpointId),
    enabled: !!endpointId,
    staleTime: 30 * 1000,
  });
};

export const useScenario = (id: string) => {
  return useQuery({
    queryKey: [QueryKey.SCENARIO, id],
    queryFn: () => getScenario(id),
    enabled: !!id,
  });
};

export const useCreateScenario = (endpointId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ScenarioInput) => createScenario(endpointId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS, endpointId] });
    },
  });
};

export const useUpdateScenario = (id: string, endpointId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Partial<ScenarioInput>) => updateScenario(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS, endpointId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIO, id] });
    },
  });
};

export const useDeleteScenario = (endpointId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS, endpointId] });
    },
  });
};

export const useActivateScenario = (endpointId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS, endpointId] });
    },
  });
};

export const useDeactivateAllScenarios = (endpointId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deactivateAllScenarios(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SCENARIOS, endpointId] });
    },
  });
};
