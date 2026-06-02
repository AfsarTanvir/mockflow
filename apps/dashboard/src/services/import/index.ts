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

async function previewFile(
  projectId: string,
  format: 'openapi' | 'postman',
  file: File
): Promise<PreviewResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await httpClient.post<PreviewResult>(
    `/api/projects/${projectId}/import/${format}/preview`,
    form,
    { headers: { 'Content-Type': undefined } }
  );
  return data;
}

async function applyFile(
  projectId: string,
  format: 'openapi' | 'postman',
  endpoints: ParsedEndpoint[],
  resolutions: Record<string, 'skip' | 'overwrite'>
): Promise<ApplyResult> {
  const { data } = await httpClient.post<ApplyResult>(
    `/api/projects/${projectId}/import/${format}/apply`,
    { endpoints, resolutions }
  );
  return data;
}

export const previewOpenApi = (projectId: string, file: File) =>
  previewFile(projectId, 'openapi', file);

export const applyOpenApi = (
  projectId: string,
  endpoints: ParsedEndpoint[],
  resolutions: Record<string, 'skip' | 'overwrite'>
) => applyFile(projectId, 'openapi', endpoints, resolutions);

export const previewPostman = (projectId: string, file: File) =>
  previewFile(projectId, 'postman', file);

export const applyPostman = (
  projectId: string,
  endpoints: ParsedEndpoint[],
  resolutions: Record<string, 'skip' | 'overwrite'>
) => applyFile(projectId, 'postman', endpoints, resolutions);
