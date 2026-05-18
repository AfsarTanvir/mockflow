import httpClient from '@/http-client';
import type { ScenarioRule, ScenarioRuleInput } from '@/types';

export async function getRules(scenarioId: string): Promise<ScenarioRule[]> {
  const { data } = await httpClient.get<ScenarioRule[]>(`/api/scenarios/${scenarioId}/rules`);
  return data;
}

export async function createRule(scenarioId: string, body: ScenarioRuleInput): Promise<ScenarioRule> {
  const { data } = await httpClient.post<ScenarioRule>(
    `/api/scenarios/${scenarioId}/rules`,
    body
  );
  return data;
}

export async function updateRule(
  id: string,
  body: Partial<ScenarioRuleInput>
): Promise<ScenarioRule> {
  const { data } = await httpClient.put<ScenarioRule>(`/api/rules/${id}`, body);
  return data;
}

export async function deleteRule(id: string): Promise<void> {
  await httpClient.delete(`/api/rules/${id}`);
}
