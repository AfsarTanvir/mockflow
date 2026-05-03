import httpClient from '@/http-client';
import type { Project } from '@/types';
import type { CreateProjectInput, UpdateProjectInput } from '@/schema/projects';

export async function getProjects(): Promise<Project[]> {
  const { data } = await httpClient.get<Project[]>('/api/projects');
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await httpClient.get<Project>(`/api/projects/${id}`);
  return data;
}

export async function createProject(body: CreateProjectInput): Promise<Project> {
  const { data } = await httpClient.post<Project>('/api/projects', body);
  return data;
}

export async function updateProject(id: string, body: UpdateProjectInput): Promise<Project> {
  const { data } = await httpClient.put<Project>(`/api/projects/${id}`, body);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await httpClient.delete(`/api/projects/${id}`);
}
