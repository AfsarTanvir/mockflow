import VersionHistory from '#models/version_history';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `version_history`. Pure reads; optional trx client. */

export function listForProject(
  projectId: string,
  limit: number,
  client?: TransactionClientContract
) {
  return VersionHistory.query({ client })
    .where('project_id', projectId)
    .preload('author')
    .orderBy('created_at', 'desc')
    .limit(limit);
}

/** A single version scoped to its project (so ids can't leak across projects). */
export function findForProject(projectId: string, id: string, client?: TransactionClientContract) {
  return VersionHistory.query({ client })
    .where('project_id', projectId)
    .where('id', id)
    .preload('author')
    .first();
}
