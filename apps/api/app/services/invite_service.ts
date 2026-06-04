import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import TeamMember from '#models/team_member';
import * as ProjectInviteQueries from '#queries/project_invite_queries';
import * as TeamMemberQueries from '#queries/team_member_queries';

/** Pending invites sent to an email, shaped for the frontend. */
export async function listPendingForEmail(email: string) {
  const invites = await ProjectInviteQueries.listPendingForEmail(email);
  return invites.map((i) => ({
    token: i.token,
    email: i.email,
    role: i.role,
    createdAt: i.createdAt,
    project: { id: i.project.id, name: i.project.name, slug: i.project.slug },
  }));
}

/** Public invite metadata for the accept screen. */
export async function getByToken(token: string) {
  const invite = await ProjectInviteQueries.findPendingByToken(token);
  if (!invite) {
    throw new Exception('Invite not found or already accepted', {
      status: 404,
      code: 'E_INVITE_NOT_FOUND',
    });
  }
  return {
    email: invite.email,
    role: invite.role,
    project: { id: invite.project.id, name: invite.project.name, slug: invite.project.slug },
  };
}

/**
 * Accept an invite: the authenticated user's email must match the invite.
 * Creates the membership and marks the invite accepted, atomically.
 */
export async function accept(token: string, userId: string, userEmail: string) {
  const invite = await ProjectInviteQueries.findPendingByToken(token);
  if (!invite) {
    throw new Exception('Invite not found or already accepted', {
      status: 404,
      code: 'E_INVITE_NOT_FOUND',
    });
  }

  if (userEmail !== invite.email) {
    throw new Exception('This invite was sent to a different email address', {
      status: 403,
      code: 'E_EMAIL_MISMATCH',
    });
  }

  const alreadyMember = await TeamMemberQueries.findForProjectUser(invite.projectId, userId);
  if (alreadyMember) {
    throw new Exception('You are already a member of this project', {
      status: 409,
      code: 'E_ALREADY_MEMBER',
    });
  }

  await db.transaction(async (trx) => {
    await TeamMember.create(
      {
        projectId: invite.projectId,
        userId,
        role: invite.role,
        invitedAt: invite.createdAt,
      },
      { client: trx }
    );

    invite.useTransaction(trx);
    invite.acceptedAt = DateTime.now();
    await invite.save();
  });

  return { projectId: invite.projectId };
}
