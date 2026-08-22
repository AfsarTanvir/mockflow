import httpClient from '@/http-client';
import type { CursorPage, CursorParams, RequestLog } from '@/types';

/** Newest-first log feed. Cursor-paginated — pass `meta.nextCursor` to page on. */
export async function getRequestLogs(
  projectId: string,
  params: CursorParams = {}
): Promise<CursorPage<RequestLog>> {
  const { data } = await httpClient.get<CursorPage<RequestLog>>(
    `/api/projects/${projectId}/request-logs`,
    { params }
  );
  return data;
}
