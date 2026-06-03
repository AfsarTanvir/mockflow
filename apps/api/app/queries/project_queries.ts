import Project from '#models/project';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/**
 * Data-access for `projects`.
 *
 * Pure reads only — no business logic, no transactions of their own.
 * Every function accepts an optional `client` so a service can run the
 * read inside its own `db.transaction()`.
 */

export function findById(id: string, client?: TransactionClientContract) {
  return Project.find(id, { client });
}

export function findBySlug(slug: string, client?: TransactionClientContract) {
  return Project.findBy('slug', slug, { client });
}

/**
 * Projects owned directly by the user (legacy fallback for projects created
 * before the team_members feature shipped). `excludeIds` filters out projects
 * already surfaced via memberships.
 */
export function listOwnedByUser(
  userId: string,
  excludeIds: string[] = [],
  client?: TransactionClientContract
) {
  const query = Project.query({ client }).where('owner_id', userId);
  if (excludeIds.length > 0) {
    query.whereNotIn('id', excludeIds);
  }
  return query.orderBy('created_at', 'desc');
}
