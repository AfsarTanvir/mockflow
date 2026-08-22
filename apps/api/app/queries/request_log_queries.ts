import RequestLog from '#models/request_log';
import { applyKeyset, type Keyset } from '#queries/pagination';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `request_logs`. Pure reads; optional trx client. */

const TABLE = 'request_logs';

/**
 * One keyset page of a project's logs, newest first. Returns `limit + 1` rows —
 * the extra one is the `hasMore` probe that `cursorPage` trims.
 */
export function listForProject(
  projectId: string,
  keyset: Keyset,
  client?: TransactionClientContract
) {
  const query = RequestLog.query({ client }).where('project_id', projectId);
  applyKeyset(query, TABLE, keyset);
  return query;
}
