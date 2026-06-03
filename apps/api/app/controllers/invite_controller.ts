import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as InviteService from '#services/invite_service';

export default class InviteController {
  /** GET /api/invites/pending (auth) — invites awaiting the current user. */
  async pending({ auth, response }: HttpContext) {
    const invites = await InviteService.listPendingForEmail(auth.user!.email);
    return response.ok(invites);
  }

  /** GET /api/invites/:token (public) — invite metadata for the accept screen. */
  async show({ params, response }: HttpContext) {
    try {
      const invite = await InviteService.getByToken(params.token);
      return response.ok(invite);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/invites/:token/accept (auth) */
  async accept({ auth, params, response }: HttpContext) {
    try {
      const result = await InviteService.accept(params.token, auth.user!.id, auth.user!.email);
      return response.ok({ message: 'Invite accepted', projectId: result.projectId });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
