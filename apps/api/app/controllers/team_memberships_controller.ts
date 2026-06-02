import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import Profile from '../models/profile.js';
import Team from '../models/team.js';
import TeamMembership from '../models/team_membership.js';
import {
  addTeamMemberValidator,
  changeTeamMemberRoleValidator,
} from '../validators/team_validator.js';
import * as TeamMembershipService from '../services/team_membership_service.js';
import { canSeeTeam } from '../services/permission_resolver.js';
import Company from '../models/company.js';

async function findActorProfile(userId: string | null, companyId: string): Promise<Profile | null> {
  if (!userId) return null;
  return Profile.query()
    .where('user_id', userId)
    .where('company_id', companyId)
    .where('status', 'active')
    .first();
}

function membershipView(m: TeamMembership, profile?: Profile | null) {
  return {
    id: m.id,
    teamId: m.teamId,
    profileId: m.profileId,
    role: m.role,
    joinedAt: m.joinedAt,
    profile: profile
      ? {
          id: profile.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          companyRole: profile.role,
          status: profile.status,
        }
      : undefined,
  };
}

export default class TeamMembershipsController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/teams/:teamId/members   (auth required)
  | Anyone who can see the team can list its members.
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const team = await Team.find(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const company = await Company.find(team.companyId);
    if (!company) return response.notFound({ message: 'Team not found' });

    const tm = await TeamMembership.query()
      .where('team_id', team.id)
      .where('profile_id', actor.id)
      .first();

    if (!canSeeTeam(actor, team, company, tm)) {
      return response.notFound({ message: 'Team not found' });
    }

    const memberships = await TeamMembership.query()
      .where('team_id', team.id)
      .preload('profile')
      .orderBy('joined_at', 'asc');

    return response.ok(memberships.map((m) => membershipView(m, m.profile)));
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/teams/:teamId/members   (auth required, team admin or company admin+)
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const team = await Team.find(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(addTeamMemberValidator);

    try {
      const membership = await TeamMembershipService.addMember(
        team,
        actor,
        data.profileId,
        data.role
      );
      return response.created(membershipView(membership));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Update Role - PATCH /api/teams/:teamId/members/:profileId
  |--------------------------------------------------------------------------
  */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const team = await Team.find(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const { role } = await request.validateUsing(changeTeamMemberRoleValidator);

    try {
      const membership = await TeamMembershipService.changeRole(
        team,
        actor,
        params.profileId,
        role
      );
      return response.ok(membershipView(membership));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/teams/:teamId/members/:profileId
  | Self-leave allowed; otherwise admin only.
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const team = await Team.find(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      await TeamMembershipService.removeMember(team, actor, params.profileId);
      return response.ok({ message: 'Membership removed' });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }
}
