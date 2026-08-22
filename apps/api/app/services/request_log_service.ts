import type RequestLog from '#models/request_log';
import * as AccessService from '#services/access_service';
import * as RequestLogQueries from '#queries/request_log_queries';
import { cursorPage, resolveKeyset, type CursorInput } from '#queries/pagination';

/** Never exposes the keyset extras Lucid attaches for cursor minting. */
const logView = (l: RequestLog) => ({
  id: l.id,
  projectId: l.projectId,
  endpointId: l.endpointId,
  method: l.method,
  path: l.path,
  statusCode: l.statusCode,
  duration: l.duration,
  createdAt: l.createdAt,
});

/**
 * One page of a project's request logs, newest first. Any team member (viewer+).
 *
 * Keyset-paginated: the table grows by one row per mock hit, so it is both the
 * largest table and one whose head moves while a user reads it — exactly where
 * offset pages duplicate and skip rows.
 */
export async function listForProject(projectId: string, userId: string, input: CursorInput) {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');

  const keyset = resolveKeyset(input);
  const rows = await RequestLogQueries.listForProject(projectId, keyset);
  return cursorPage(rows, keyset, logView);
}
