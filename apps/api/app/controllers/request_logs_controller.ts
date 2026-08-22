import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as RequestLogService from '#services/request_log_service';
import { cursorListValidator } from '#validators/pagination_validator';

export default class RequestLogsController {
  /** GET /api/projects/:projectId/request-logs?limit=&cursor= — newest first. Viewer+. */
  async index({ auth, params, request, response }: HttpContext) {
    const { cursor, limit } = await request.validateUsing(cursorListValidator);
    try {
      const page = await RequestLogService.listForProject(params.projectId, auth.user!.id, {
        cursor,
        limit,
      });
      return response.ok(page);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
