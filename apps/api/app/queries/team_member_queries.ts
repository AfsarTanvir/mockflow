import TeamMember from '#models/team_member';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/**
 * Data-access for the legacy project `team_members` table.
 *
 * Pure reads only — no business logic, no transactions of their own.
 * Every function accepts an optional `client` so a service can run the
 * read inside its own `db.transaction()`.
 */

/** The requester's membership row for a project, or null. */
export function findForProjectUser(
  projectId: string,
  userId: string,
  client?: TransactionClientContract
) {
  return TeamMember.query({ client })
    .where('project_id', projectId)
    .where('user_id', userId)
    .first();
}

/** All memberships for a user, newest first, with the project preloaded. */
export function listForUser(userId: string, client?: TransactionClientContract) {
  return TeamMember.query({ client })
    .where('user_id', userId)
    .preload('project')
    .orderBy('created_at', 'desc');
}
