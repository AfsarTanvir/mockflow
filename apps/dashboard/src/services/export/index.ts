import httpClient from '@/http-client';

async function downloadBlob(projectId: string, format: 'openapi' | 'postman', evaluate: boolean) {
  const { data, headers } = await httpClient.get(
    `/api/projects/${projectId}/export/${format}?evaluate=${evaluate}`,
    { responseType: 'blob' }
  );

  const disposition = headers['content-disposition'] ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `export-${format}.json`;

  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportOpenApiRaw(projectId: string) {
  return downloadBlob(projectId, 'openapi', false);
}

export function exportOpenApiEvaluated(projectId: string) {
  return downloadBlob(projectId, 'openapi', true);
}

export function exportPostmanRaw(projectId: string) {
  return downloadBlob(projectId, 'postman', false);
}

export function exportPostmanEvaluated(projectId: string) {
  return downloadBlob(projectId, 'postman', true);
}
