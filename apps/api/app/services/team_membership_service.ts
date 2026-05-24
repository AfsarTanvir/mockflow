import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';
import { Exception } from '@adonisjs/core/exceptions';
import Profile from '../models/profile.js';
import Team from '../models/team.js';
import TeamMembership from '../models/team_membership.js';
import TeamMetadata from '../models/team_metadata.js';
import type { TeamRole } from '../models/team_membership.js';

type CompanyRole = 'owner' | 'admin' | 'member' | 'viewer';
const COMPANY_ROLE_RANK: Record<CompanyRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Returns true if actor can manage this team:
 *   - Company owner/admin always
 *   - OR has a team_membership with role='admin' on this team
 */
async function canManageTeam(actor: Profile, team: Team): Promise<boolean> {
  if (COMPANY_ROLE_RANK[actor.role] >= COMPANY_ROLE_RANK.admin) return true;
  const tm = await TeamMembership.query()
    .where('profile_id', actor.id)
    .where('team_id', team.id)
    .first();
  return tm?.role === 'admin';
}

/**
 * Add a profile to a team. Permission rules:
 *   - Actor must be active in the team's company
 *   - Actor must be team admin OR company admin/owner
 *   - Target profile must be in the same company AND active
 *   - Target cannot already be a member of the team (caught by unique constraint;
 *     we pre-check for a clean error)
 */
export async function addMember(
  team: Team,
  actor: Profile,
  targetProfileId: string,
  role: TeamRole = 'member'
): Promise<TeamMembership> {
  if (!(await canManageTeam(actor, team))) {
    throw new Exception('Only team admins or company admins can add members', { status: 403 });
  }

  const target = await Profile.find(targetProfileId);
  if (!target) throw new Exception('Profile not found', { status: 404 });
  if (target.companyId !== team.companyId) {
    throw new Exception('Profile is in a different company', { status: 403 });
  }
  if (target.status !== 'active') {
    throw new Exception('Profile is not active', { status: 422 });
  }

  const existing = await TeamMembership.query()
    .where('team_id', team.id)
    .where('profile_id', targetProfileId)
    .first();
  if (existing) {
    throw new Exception('Profile is already a member of this team', { status: 409 });
  }

  return db.transaction(async (trx) => {
    const membership = await TeamMembership.create(
      {
        teamId: team.id,
        profileId: targetProfileId,
        role,
        joinedAt: DateTime.now(),
      },
      { client: trx }
    );

    await TeamMetadata.query({ client: trx })
      .where('team_id', team.id)
      .increment('total_member', 1);

    return membership;
  });
}

/**
 * Remove a profile from a team.
 *   - Self-leave: actor.id === target.profileId — always allowed.
 *   - Otherwise: actor must be team admin OR company admin+.
 */
export async function removeMember(
  team: Team,
  actor: Profile,
  targetProfileId: string
): Promise<void> {
  const isSelfLeave = actor.id === targetProfileId;
  if (!isSelfLeave && !(await canManageTeam(actor, team))) {
    throw new Exception('Only team admins or company admins can remove members', { status: 403 });
  }

  const membership = await TeamMembership.query()
    .where('team_id', team.id)
    .where('profile_id', targetProfileId)
    .first();
  if (!membership) throw new Exception('Membership not found', { status: 404 });

  await db.transaction(async (trx) => {
    membership.useTransaction(trx);
    await membership.delete();

    await TeamMetadata.query({ client: trx })
      .where('team_id', team.id)
      .decrement('total_member', 1);
  });
}

/**
 * Change a profile's role within a team. Admin+ only, and no self-change.
 */
export async function changeRole(
  team: Team,
  actor: Profile,
  targetProfileId: string,
  newRole: TeamRole
): Promise<TeamMembership> {
  if (!(await canManageTeam(actor, team))) {
    throw new Exception('Only team admins or company admins can change roles', { status: 403 });
  }
  if (actor.id === targetProfileId) {
    throw new Exception('You cannot change your own team role', { status: 403 });
  }

  const membership = await TeamMembership.query()
    .where('team_id', team.id)
    .where('profile_id', targetProfileId)
    .first();
  if (!membership) throw new Exception('Membership not found', { status: 404 });

  membership.role = newRole;
  await membership.save();
  return membership;
}

/**
 * Delete every team_membership belonging to a profile and decrement
 * each affected team's total_member counter. Called by ProfileService.setInactive
 * inside its existing transaction — exported as a tx-aware helper so the
 * caller can chain it.
 */
export async function cleanupForInactiveProfile(
  profileId: string,
  trx: TransactionClientContract
): Promise<number> {
  const memberships = await TeamMembership.query({ client: trx }).where('profile_id', profileId);
  if (memberships.length === 0) return 0;

  for (const m of memberships) {
    await TeamMetadata.query({ client: trx })
      .where('team_id', m.teamId)
      .decrement('total_member', 1);
  }
  await TeamMembership.query({ client: trx }).where('profile_id', profileId).delete();
  return memberships.length;
}
