import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import type Project from '#models/project';
import ProjectInvite from '#models/project_invite';
import * as AccessService from '#services/access_service';
import * as TeamMemberQueries from '#queries/team_member_queries';
import * as ProjectInviteQueries from '#queries/project_invite_queries';
import * as UserQueries from '#queries/user_queries';
import { sendInviteEmail } from '#services/email_service';
import type { inviteValidator, updateRoleValidator } from '#validators/team_validator';

export type InviteInput = Infer<typeof inviteValidator>;
export type UpdateRoleInput = Infer<typeof updateRoleValidator>;

/**
 * The legacy per-project collaborator flow (invites + project-scoped roles) does
 * not apply to team-owned projects — their access derives from team membership
 * and company role. Allowing it here would let a team admin add outsiders with
 * no company profile directly into team_members, bypassing the team model.
 */
function assertNotTeamOwned(project: Project): void {
  if (project.teamId) {
    throw new Exception(
      'This project belongs to a team — manage access through the team’s members, not project invites.',
      { status: 409, code: 'E_TEAM_OWNED_PROJECT' }
    );
  }
}

/** Members + pending invites for a project, plus the requester's role. Viewer+. */
export async function listTeam(projectId: string, userId: string) {
  const { project, role } = await AccessService.assertProjectAccess(projectId, userId, 'viewer');

  const members = await TeamMemberQueries.listForProjectWithUser(project.id);
  const invites = await ProjectInviteQueries.listPendingForProject(project.id);

  return {
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
    currentUserRole: role,
  };
}

/** Invite someone to a project. Owner/admin only. Cannot invite as owner. */
export async function invite(
  projectId: string,
  userId: string,
  inviterName: string,
  input: InviteInput
): Promise<ProjectInvite> {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');
  assertNotTeamOwned(project);

  const existingUser = await UserQueries.findByEmail(input.email);
  if (existingUser) {
    const alreadyMember = await TeamMemberQueries.findForProjectUser(project.id, existingUser.id);
    if (alreadyMember) {
      throw new Exception('This user is already a team member', {
        status: 409,
        code: 'E_ALREADY_MEMBER',
      });
    }
  }

  const pending = await ProjectInviteQueries.findPendingByEmail(project.id, input.email);
  if (pending) {
    throw new Exception('An invite is already pending for this email', {
      status: 409,
      code: 'E_INVITE_PENDING',
    });
  }

  const invite = await ProjectInvite.create({
    projectId: project.id,
    email: input.email,
    role: input.role,
    token: crypto.randomUUID(),
    invitedBy: userId,
  });

  // Fire-and-forget — don't fail the request if email delivery fails.
  sendInviteEmail({
    toEmail: input.email,
    inviterName,
    projectName: project.name,
    role: input.role,
    inviteToken: invite.token,
  }).catch((err) => console.error('[invite email]', err));

  return invite;
}

/** Change a member's role. Owner can set any role; admin can only set member/viewer. */
export async function changeRole(
  projectId: string,
  userId: string,
  memberId: string,
  input: UpdateRoleInput
) {
  const { project, role: actorRole } = await AccessService.assertProjectAccess(
    projectId,
    userId,
    'admin'
  );
  assertNotTeamOwned(project);

  const target = await TeamMemberQueries.findInProjectById(project.id, memberId);
  if (!target) {
    throw new Exception('Member not found', { status: 404, code: 'E_MEMBER_NOT_FOUND' });
  }
  if (target.role === 'owner') {
    throw new Exception('Cannot change the owner role', { status: 403, code: 'E_OWNER_LOCKED' });
  }
  if (actorRole !== 'owner' && AccessService.hasRank(input.role, 'admin')) {
    throw new Exception('Only the owner can assign the admin role', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }

  target.role = input.role;
  await target.save();
  return target;
}

/** Remove a member. Owner/admin only. The owner cannot be removed. */
export async function removeMember(projectId: string, userId: string, memberId: string) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');
  assertNotTeamOwned(project);

  const target = await TeamMemberQueries.findInProjectById(project.id, memberId);
  if (!target) {
    throw new Exception('Member not found', { status: 404, code: 'E_MEMBER_NOT_FOUND' });
  }
  if (target.role === 'owner') {
    throw new Exception('Cannot remove the project owner', { status: 403, code: 'E_OWNER_LOCKED' });
  }

  await target.delete();
}

/** Revoke a pending invite. Owner/admin only. */
export async function revokeInvite(projectId: string, userId: string, inviteId: string) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');
  assertNotTeamOwned(project);

  const invite = await ProjectInviteQueries.findPendingByIdInProject(project.id, inviteId);
  if (!invite) {
    throw new Exception('Invite not found', { status: 404, code: 'E_INVITE_NOT_FOUND' });
  }

  await invite.delete();
}

/** All projects the user is a member of (their personal membership list). */
export async function listMembershipsForUser(userId: string) {
  const memberships = await TeamMemberQueries.listForUser(userId);
  return memberships.map((m) => ({
    id: m.id,
    role: m.role,
    invitedAt: m.invitedAt,
    project: {
      id: m.project.id,
      name: m.project.name,
      slug: m.project.slug,
      ownerId: m.project.ownerId,
    },
  }));
}
