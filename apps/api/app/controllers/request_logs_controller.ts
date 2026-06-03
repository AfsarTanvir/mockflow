import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as RequestLogService from '#services/request_log_service';

export default class RequestLogsController {
  /** GET /api/projects/:projectId/request-logs — latest 100 logs. Viewer+. */
  async index({ auth, params, response }: HttpContext) {
    try {
      const logs = await RequestLogService.listForProject(params.projectId, auth.user!.id);
      return response.ok(logs);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
