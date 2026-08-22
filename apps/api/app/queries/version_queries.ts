import db from '@adonisjs/lucid/services/db';
import VersionHistory from '#models/version_history';
import { applyKeyset, type Keyset } from '#queries/pagination';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `version_history`. Pure reads; optional trx client. */

const TABLE = 'version_history';

/** `$extras` key holding the SQL-computed endpoint count for a list row. */
export const ENDPOINT_COUNT_COLUMN = 'endpoint_count';

/**
 * One keyset page of a project's snapshots, newest first. Returns `limit + 1`
 * rows — the extra one is the `hasMore` probe that `cursorPage` trims.
 *
 * The `snapshot` blob is deliberately NOT selected: the list only needs its
 * endpoint count, and every snapshot stores the full response body of every
 * endpoint. Selecting it would pull a page's worth of those over the wire (and
 * JSON-parse them) to produce a single integer, so the count is done in SQL.
 */
export function listForProject(
  projectId: string,
  keyset: Keyset,
  client?: TransactionClientContract
) {
  const query = VersionHistory.query({ client }).where('project_id', projectId).preload('author');
  applyKeyset(query, TABLE, keyset, [
    `${TABLE}.id`,
    `${TABLE}.project_id`,
    `${TABLE}.message`,
    `${TABLE}.created_at`,
    `${TABLE}.created_by`,
    db.raw(
      `coalesce(jsonb_array_length(${TABLE}.snapshot -> 'endpoints'), 0) as ${ENDPOINT_COUNT_COLUMN}`
    ),
  ]);
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
