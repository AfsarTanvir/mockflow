import TeamMembership from '#models/team_membership';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `team_memberships` (workspace teams). Pure reads; optional trx client. */

export function findForProfileTeam(
  profileId: string,
  teamId: string,
  client?: TransactionClientContract
) {
  return TeamMembership.query({ client })
    .where('profile_id', profileId)
    .where('team_id', teamId)
    .first();
}

/** A profile's memberships restricted to a set of teams (visibility filtering). */
export function listForProfileInTeams(
  profileId: string,
  teamIds: string[],
  client?: TransactionClientContract
) {
  return TeamMembership.query({ client })
    .where('profile_id', profileId)
    .whereIn('team_id', teamIds);
}

/** All members of a team (oldest first) with their profile preloaded. */
export function listForTeamWithProfile(teamId: string, client?: TransactionClientContract) {
  return TeamMembership.query({ client })
    .where('team_id', teamId)
    .preload('profile')
    .orderBy('joined_at', 'asc');
}
