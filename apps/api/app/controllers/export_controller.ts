import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ExportService from '#services/export_service';

export default class ExportController {
  /** GET /api/projects/:id/export/openapi?evaluate=false */
  async openapi({ auth, params, request, response }: HttpContext) {
    const evaluate = request.input('evaluate', 'false') === 'true';
    try {
      const { doc, filename } = await ExportService.buildOpenApi(
        params.id,
        auth.user!.id,
        evaluate
      );
      response.header('Content-Type', 'application/json');
      response.header('Content-Disposition', `attachment; filename="${filename}"`);
      return response.ok(doc);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/projects/:id/export/postman?evaluate=false */
  async postman({ auth, params, request, response }: HttpContext) {
    const evaluate = request.input('evaluate', 'false') === 'true';
    try {
      const { collection, filename } = await ExportService.buildPostman(
        params.id,
        auth.user!.id,
        evaluate
      );
      response.header('Content-Type', 'application/json');
      response.header('Content-Disposition', `attachment; filename="${filename}"`);
      return response.ok(collection);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
