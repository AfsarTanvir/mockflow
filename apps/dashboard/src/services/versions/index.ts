import httpClient from '@/http-client';
import type { ProjectVersion, ProjectVersionDetail } from '@/types';

export async function getVersions(projectId: string): Promise<ProjectVersion[]> {
  const { data } = await httpClient.get<ProjectVersion[]>(`/api/projects/${projectId}/versions`);
  return data;
}

export async function getVersion(projectId: string, id: string): Promise<ProjectVersionDetail> {
  const { data } = await httpClient.get<ProjectVersionDetail>(
    `/api/projects/${projectId}/versions/${id}`
  );
  return data;
}

export async function createVersion(
  projectId: string,
  message: string | null
): Promise<ProjectVersion> {
  const { data } = await httpClient.post<ProjectVersion>(`/api/projects/${projectId}/versions`, {
    message,
  });
  return data;
}

export async function restoreVersion(projectId: string, versionId: string): Promise<void> {
  await httpClient.post(`/api/projects/${projectId}/versions/${versionId}/restore`);
}
