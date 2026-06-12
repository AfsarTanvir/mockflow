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
  // Personal projects only — team-owned projects live under their team.
  const query = Project.query({ client }).where('owner_id', userId).whereNull('team_id');
  if (excludeIds.length > 0) {
    query.whereNotIn('id', excludeIds);
  }
  return query.orderBy('created_at', 'desc');
}

/** Projects owned by a workspace team (newest first), owner preloaded. */
export function listForTeam(teamId: string, client?: TransactionClientContract) {
  return Project.query({ client })
    .where('team_id', teamId)
    .preload('owner')
    .orderBy('created_at', 'desc');
}

/** Every team-owned project across a company, with team + owner preloaded. */
export function listForCompany(companyId: string, client?: TransactionClientContract) {
  return Project.query({ client })
    .whereIn('team_id', (sub) => sub.from('teams').select('id').where('company_id', companyId))
    .preload('team')
    .preload('owner')
    .orderBy('created_at', 'desc');
}
