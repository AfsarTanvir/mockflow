import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import type Profile from '#models/profile';
import type TeamMembership from '#models/team_membership';
import * as CompanyQueries from '#queries/company_queries';
import * as ProfileQueries from '#queries/profile_queries';
import * as TeamQueries from '#queries/team_queries';
import * as TeamMembershipQueries from '#queries/team_membership_queries';
import * as TeamMembershipService from '#services/team_membership_service';
import { canSeeTeam } from '#services/permission_resolver';
import { addTeamMemberValidator, changeTeamMemberRoleValidator } from '#validators/team_validator';

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
  /** GET /api/teams/:teamId/members — anyone who can see the team. */
  async index({ auth, params, response }: HttpContext) {
    const team = await TeamQueries.findById(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const company = await CompanyQueries.findById(team.companyId);
    if (!company) return response.notFound({ message: 'Team not found' });

    const tm = await TeamMembershipQueries.findForProfileTeam(actor.id, team.id);
    if (!canSeeTeam(actor, team, company, tm)) {
      return response.notFound({ message: 'Team not found' });
    }

    const memberships = await TeamMembershipQueries.listForTeamWithProfile(team.id);
    return response.ok(memberships.map((m) => membershipView(m, m.profile)));
  }

  /** POST /api/teams/:teamId/members — team admin or company admin+. */
  async store({ auth, params, request, response }: HttpContext) {
    const team = await TeamQueries.findById(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
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
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PATCH /api/teams/:teamId/members/:profileId */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const team = await TeamQueries.findById(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
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
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/teams/:teamId/members/:profileId — self-leave or admin. */
  async destroy({ auth, params, response }: HttpContext) {
    const team = await TeamQueries.findById(params.teamId);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      await TeamMembershipService.removeMember(team, actor, params.profileId);
      return response.ok({ message: 'Membership removed' });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
