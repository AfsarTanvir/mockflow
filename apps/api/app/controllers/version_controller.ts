import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as VersionService from '#services/version_service';
import { cursorListValidator } from '#validators/pagination_validator';

export default class VersionController {
  /** GET /api/projects/:projectId/versions?limit=&cursor= — newest first. */
  async index({ auth, params, request, response }: HttpContext) {
    const { cursor, limit } = await request.validateUsing(cursorListValidator);
    try {
      const page = await VersionService.listForProject(params.projectId, auth.user!.id, {
        cursor,
        limit,
      });
      return response.ok(page);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/projects/:projectId/versions */
  async store({ auth, params, request, response }: HttpContext) {
    const message: string | null = request.input('message', null);
    try {
      const version = await VersionService.createVersion(
        params.projectId,
        auth.user!.id,
        auth.user!.name,
        message
      );
      return response.created(version);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/projects/:projectId/versions/:id */
  async show({ auth, params, response }: HttpContext) {
    try {
      const version = await VersionService.getVersion(params.projectId, auth.user!.id, params.id);
      return response.ok(version);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/projects/:projectId/versions/:id/restore */
  async restore({ auth, params, response }: HttpContext) {
    try {
      const result = await VersionService.restoreVersion(
        params.projectId,
        auth.user!.id,
        params.id
      );
      return response.ok(result);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
