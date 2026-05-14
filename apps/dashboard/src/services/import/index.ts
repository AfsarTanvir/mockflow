import httpClient from '@/http-client';

export interface ParsedEndpoint {
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
}

export interface ImportConflict {
  method: string;
  path: string;
  existingId: string;
  incoming: ParsedEndpoint;
}

export interface PreviewResult {
  endpoints: ParsedEndpoint[];
  conflicts: ImportConflict[];
  warnings: string[];
}

export interface ApplyResult {
  created: number;
  overwritten: number;
  skipped: number;
  errors: string[];
}

export async function previewOpenApi(projectId: string, file: File): Promise<PreviewResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await httpClient.post<PreviewResult>(
    `/api/projects/${projectId}/import/openapi/preview`,
    form
  );
  return data;
}

export async function applyOpenApi(
  projectId: string,
  endpoints: ParsedEndpoint[],
  resolutions: Record<string, 'skip' | 'overwrite'>
): Promise<ApplyResult> {
  const { data } = await httpClient.post<ApplyResult>(
    `/api/projects/${projectId}/import/openapi/apply`,
    { endpoints, resolutions }
  );
  return data;
}
