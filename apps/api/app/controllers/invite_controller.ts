import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import ProjectInvite from '../models/project_invite.js';
import TeamMember from '../models/team_member.js';

export default class InviteController {
  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/invites/:token   (public)
  | Returns invite metadata so the frontend can show project + role info.
  |--------------------------------------------------------------------------
  */
  /*
  |--------------------------------------------------------------------------
  | Pending - GET /api/invites/pending   (auth required)
  | Returns all unaccepted invites sent to the logged-in user's email.
  |--------------------------------------------------------------------------
  */
  async pending({ auth, response }: HttpContext) {
    const invites = await ProjectInvite.query()
      .where('email', auth.user!.email)
      .whereNull('accepted_at')
      .preload('project')
      .orderBy('created_at', 'desc');

    return response.ok(
      invites.map((i) => ({
        token: i.token,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        project: {
          id: i.project.id,
          name: i.project.name,
          slug: i.project.slug,
        },
      }))
    );
  }

  async show({ params, response }: HttpContext) {
    const invite = await ProjectInvite.query()
      .where('token', params.token)
      .whereNull('accepted_at')
      .preload('project')
      .first();

    if (!invite) {
      return response.notFound({ message: 'Invite not found or already accepted' });
    }

    return response.ok({
      email: invite.email,
      role: invite.role,
      project: {
        id: invite.project.id,
        name: invite.project.name,
        slug: invite.project.slug,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Accept - POST /api/invites/:token/accept   (auth required)
  | Creates a TeamMember record and marks the invite as accepted.
  |--------------------------------------------------------------------------
  */
  async accept({ auth, params, response }: HttpContext) {
    const invite = await ProjectInvite.query()
      .where('token', params.token)
      .whereNull('accepted_at')
      .first();

    if (!invite) {
      return response.notFound({ message: 'Invite not found or already accepted' });
    }

    if (auth.user!.email !== invite.email) {
      throw new Exception('This invite was sent to a different email address', { status: 403 });
    }

    const alreadyMember = await TeamMember.query()
      .where('project_id', invite.projectId)
      .where('user_id', auth.user!.id)
      .first();

    if (alreadyMember) {
      return response.conflict({ message: 'You are already a member of this project' });
    }

    await TeamMember.create({
      projectId: invite.projectId,
      userId: auth.user!.id,
      role: invite.role,
      invitedAt: invite.createdAt,
    });

    invite.acceptedAt = DateTime.now();
    await invite.save();

    return response.ok({ message: 'Invite accepted', projectId: invite.projectId });
  }
}
