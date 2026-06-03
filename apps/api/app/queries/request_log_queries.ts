import RequestLog from '#models/request_log';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `request_logs`. Pure reads; optional trx client. */

export function listForProject(
  projectId: string,
  limit: number,
  client?: TransactionClientContract
) {
  return RequestLog.query({ client })
    .where('project_id', projectId)
    .orderBy('created_at', 'desc')
    .limit(limit);
}
