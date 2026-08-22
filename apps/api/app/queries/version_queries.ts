import VersionHistory from '#models/version_history';
import { applyKeyset, type Keyset } from '#queries/pagination';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `version_history`. Pure reads; optional trx client. */

const TABLE = 'version_history';

/**
 * One keyset page of a project's snapshots, newest first. Returns `limit + 1`
 * rows — the extra one is the `hasMore` probe that `cursorPage` trims.
 */
export function listForProject(
  projectId: string,
  keyset: Keyset,
  client?: TransactionClientContract
) {
  const query = VersionHistory.query({ client }).where('project_id', projectId).preload('author');
  applyKeyset(query, TABLE, keyset);
  return query;
}

/** A single version scoped to its project (so ids can't leak across projects). */
export function findForProject(projectId: string, id: string, client?: TransactionClientContract) {
  return VersionHistory.query({ client })
    .where('project_id', projectId)
    .where('id', id)
    .preload('author')
    .first();
}
