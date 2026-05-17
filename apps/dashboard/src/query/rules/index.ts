import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRules, createRule, updateRule, deleteRule } from '@/services/rules';
import { QueryKey } from '@/types/query-key.enum';
import type { ScenarioRuleInput } from '@/types';

export const useRules = (scenarioId: string) => {
  return useQuery({
    queryKey: [QueryKey.RULES, scenarioId],
    queryFn: () => getRules(scenarioId),
    enabled: !!scenarioId,
    staleTime: 30 * 1000,
  });
};

export const useCreateRule = (scenarioId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ScenarioRuleInput) => createRule(scenarioId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.RULES, scenarioId] });
    },
  });
};

export const useUpdateRule = (scenarioId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ScenarioRuleInput> }) =>
      updateRule(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.RULES, scenarioId] });
    },
  });
};

export const useDeleteRule = (scenarioId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.RULES, scenarioId] });
    },
  });
};
