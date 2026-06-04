import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ProjectTeamService from '#services/project_team_service';
import { inviteValidator, updateRoleValidator } from '#validators/team_validator';

export default class TeamController {
  /** GET /api/projects/:projectId/team */
  async index({ auth, params, response }: HttpContext) {
    try {
      const team = await ProjectTeamService.listTeam(params.projectId, auth.user!.id);
      return response.ok(team);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/projects/:projectId/team/invite */
  async invite({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(inviteValidator);
    try {
      const invite = await ProjectTeamService.invite(
        params.projectId,
        auth.user!.id,
        auth.user!.name,
        data
      );
      return response.created({
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          token: invite.token,
          createdAt: invite.createdAt,
        },
      });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PUT /api/projects/:projectId/team/:memberId/role */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateRoleValidator);
    try {
      const member = await ProjectTeamService.changeRole(
        params.projectId,
        auth.user!.id,
        params.memberId,
        data
      );
      return response.ok({ member: { id: member.id, role: member.role, userId: member.userId } });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/projects/:projectId/team/:memberId */
  async removeMember({ auth, params, response }: HttpContext) {
    try {
      await ProjectTeamService.removeMember(params.projectId, auth.user!.id, params.memberId);
      return response.ok({ message: 'Member removed' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/projects/:projectId/invites/:inviteId */
  async revokeInvite({ auth, params, response }: HttpContext) {
    try {
      await ProjectTeamService.revokeInvite(params.projectId, auth.user!.id, params.inviteId);
      return response.ok({ message: 'Invite revoked' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/team — the current user's memberships. */
  async myMemberships({ auth, response }: HttpContext) {
    const memberships = await ProjectTeamService.listMembershipsForUser(auth.user!.id);
    return response.ok(memberships);
  }
}
