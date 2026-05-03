import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';
import Project from '../models/project.js';
import TeamMember from '../models/team_member.js';
import ProjectInvite from '../models/project_invite.js';
import User from '../models/user.js';
import { inviteValidator, updateRoleValidator } from '../validators/team_validator.js';
import { sendInviteEmail } from '../services/email_service.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_RANK: Record<TeamRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

async function resolveAccess(
  projectId: string,
  userId: string,
  minRole: TeamRole
): Promise<{ project: Project; role: TeamRole }> {
  const project = await Project.find(projectId);
  if (!project) throw new Exception('Project not found', { status: 404 });

  let role: TeamRole;

  if (project.ownerId === userId) {
    role = 'owner';
  } else {
    const tm = await TeamMember.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .first();
    if (!tm) throw new Exception('Access denied', { status: 403 });
    role = tm.role;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Exception('Insufficient permissions', { status: 403 });
  }

  return { project, role };
}

export default class TeamController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/projects/:projectId/team
  | Returns members + pending invites. Visible to all project members.
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const { project, role: actorRole } = await resolveAccess(
      params.projectId,
      auth.user!.id,
      'viewer'
    );

    const members = await TeamMember.query()
      .where('project_id', project.id)
      .preload('user')
      .orderBy('created_at', 'asc');

    const invites = await ProjectInvite.query()
      .where('project_id', project.id)
      .whereNull('accepted_at')
      .orderBy('created_at', 'desc');

    return response.ok({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
        },
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        createdAt: i.createdAt,
      })),
      currentUserRole: actorRole,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Invite - POST /api/projects/:projectId/team/invite
  | Owner and admin can invite. Cannot invite as owner.
  |--------------------------------------------------------------------------
  */
  async invite({ auth, params, request, response }: HttpContext) {
    const { project } = await resolveAccess(params.projectId, auth.user!.id, 'admin');

    const { email, role } = await request.validateUsing(inviteValidator);

    // If the invited email belongs to an existing user, check they're not already a member
    const existingUser = await User.findBy('email', email);
    if (existingUser) {
      const alreadyMember = await TeamMember.query()
        .where('project_id', project.id)
        .where('user_id', existingUser.id)
        .first();
      if (alreadyMember) {
        return response.conflict({ message: 'This user is already a team member' });
      }
    }

    // Check for a pending invite to the same email
    const pendingInvite = await ProjectInvite.query()
      .where('project_id', project.id)
      .where('email', email)
      .whereNull('accepted_at')
      .first();
    if (pendingInvite) {
      return response.conflict({ message: 'An invite is already pending for this email' });
    }

    const invite = await ProjectInvite.create({
      projectId: project.id,
      email,
      role,
      token: crypto.randomUUID(),
      invitedBy: auth.user!.id,
    });

    // Fire-and-forget — don't fail the request if email delivery fails
    sendInviteEmail({
      toEmail: email,
      inviterName: auth.user!.name,
      projectName: project.name,
      role,
      inviteToken: invite.token,
    }).catch((err) => console.error('[invite email]', err));

    return response.created({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        createdAt: invite.createdAt,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update Role - PUT /api/projects/:projectId/team/:memberId/role
  | Owner can change any role. Admin can only set member/viewer.
  |--------------------------------------------------------------------------
  */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const { project, role: actorRole } = await resolveAccess(
      params.projectId,
      auth.user!.id,
      'admin'
    );

    const target = await TeamMember.query()
      .where('project_id', project.id)
      .where('id', params.memberId)
      .firstOrFail();

    if (target.role === 'owner') {
      throw new Exception('Cannot change the owner role', { status: 403 });
    }

    const { role } = await request.validateUsing(updateRoleValidator);

    // Admins cannot promote another member to admin — only owner can do that
    if (actorRole !== 'owner' && ROLE_RANK[role] >= ROLE_RANK['admin']) {
      throw new Exception('Only the owner can assign the admin role', { status: 403 });
    }

    target.role = role;
    await target.save();

    return response.ok({
      member: {
        id: target.id,
        role: target.role,
        userId: target.userId,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Remove Member - DELETE /api/projects/:projectId/team/:memberId
  | Owner and admin can remove members. Owner cannot be removed.
  |--------------------------------------------------------------------------
  */
  async removeMember({ auth, params, response }: HttpContext) {
    const { project } = await resolveAccess(params.projectId, auth.user!.id, 'admin');

    const target = await TeamMember.query()
      .where('project_id', project.id)
      .where('id', params.memberId)
      .firstOrFail();

    if (target.role === 'owner') {
      throw new Exception('Cannot remove the project owner', { status: 403 });
    }

    await target.delete();

    return response.ok({ message: 'Member removed' });
  }

  /*
  |--------------------------------------------------------------------------
  | Revoke Invite - DELETE /api/projects/:projectId/invites/:inviteId
  |--------------------------------------------------------------------------
  */
  async revokeInvite({ auth, params, response }: HttpContext) {
    const { project } = await resolveAccess(params.projectId, auth.user!.id, 'admin');

    const invite = await ProjectInvite.query()
      .where('project_id', project.id)
      .where('id', params.inviteId)
      .whereNull('accepted_at')
      .firstOrFail();

    await invite.delete();

    return response.ok({ message: 'Invite revoked' });
  }

  /*
  |--------------------------------------------------------------------------
  | My Memberships - GET /api/team
  | Returns all projects the authenticated user is a member of.
  |--------------------------------------------------------------------------
  */
  async myMemberships({ auth, response }: HttpContext) {
    const memberships = await TeamMember.query()
      .where('user_id', auth.user!.id)
      .preload('project')
      .orderBy('created_at', 'desc');

    return response.ok(
      memberships.map((m) => ({
        id: m.id,
        role: m.role,
        invitedAt: m.invitedAt,
        project: {
          id: m.project.id,
          name: m.project.name,
          slug: m.project.slug,
          ownerId: m.project.ownerId,
        },
      }))
    );
  }
}
