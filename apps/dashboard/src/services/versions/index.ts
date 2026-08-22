import httpClient from '@/http-client';
import type { CursorPage, CursorParams, ProjectVersion, ProjectVersionDetail } from '@/types';

/** Newest-first snapshot history. Cursor-paginated (no longer capped at 50). */
export async function getVersions(
  projectId: string,
  params: CursorParams = {}
): Promise<CursorPage<ProjectVersion>> {
  const { data } = await httpClient.get<CursorPage<ProjectVersion>>(
    `/api/projects/${projectId}/versions`,
    { params }
  );
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
