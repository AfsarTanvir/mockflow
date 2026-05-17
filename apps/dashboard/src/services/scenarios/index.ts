import httpClient from '@/http-client';
import type { Scenario, ScenarioInput } from '@/types';

export async function getScenarios(endpointId: string): Promise<Scenario[]> {
  const { data } = await httpClient.get<Scenario[]>(`/api/endpoints/${endpointId}/scenarios`);
  return data;
}

export async function getScenario(id: string): Promise<Scenario> {
  const { data } = await httpClient.get<Scenario>(`/api/scenarios/${id}`);
  return data;
}

export async function createScenario(endpointId: string, body: ScenarioInput): Promise<Scenario> {
  const { data } = await httpClient.post<Scenario>(
    `/api/endpoints/${endpointId}/scenarios`,
    body
  );
  return data;
}

export async function updateScenario(id: string, body: Partial<ScenarioInput>): Promise<Scenario> {
  const { data } = await httpClient.put<Scenario>(`/api/scenarios/${id}`, body);
  return data;
}

export async function deleteScenario(id: string): Promise<void> {
  await httpClient.delete(`/api/scenarios/${id}`);
}
