import httpClient from '@/http-client';
import type { Endpoint } from '@/types';
import type { CreateEndpointInput, UpdateEndpointInput } from '@/schema/endpoints';

export async function getEndpoints(projectId: string): Promise<Endpoint[]> {
  const { data } = await httpClient.get<Endpoint[]>(`/api/projects/${projectId}/endpoints`);
  return data;
}

export async function getEndpoint(id: string): Promise<Endpoint> {
  const { data } = await httpClient.get<Endpoint>(`/api/endpoints/${id}`);
  return data;
}

export async function createEndpoint(
  projectId: string,
  body: CreateEndpointInput & { responseBody: Record<string, unknown> | null }
): Promise<Endpoint> {
  const { data } = await httpClient.post<Endpoint>(`/api/projects/${projectId}/endpoints`, body);
  return data;
}

export async function updateEndpoint(
  id: string,
  body: UpdateEndpointInput & { responseBody?: Record<string, unknown> | null }
): Promise<Endpoint> {
  const { data } = await httpClient.put<Endpoint>(`/api/endpoints/${id}`, body);
  return data;
}

export async function deleteEndpoint(id: string): Promise<void> {
  await httpClient.delete(`/api/endpoints/${id}`);
}

export async function toggleEndpoint(id: string): Promise<Endpoint> {
  const { data } = await httpClient.patch<Endpoint>(`/api/endpoints/${id}/toggle`);
  return data;
}
