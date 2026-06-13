import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as MockService from '#services/mock_service';

export default class MockController {
  /** ANY /mock/:projectSlug/* — serve a configured mock response. */
  async execute({ request, response, params, auth }: HttpContext) {
    const start = Date.now();
    const wildcard = params['*'];
    const incomingPath = '/' + (Array.isArray(wildcard) ? wildcard.join('/') : (wildcard ?? ''));
    const method = request.method().toUpperCase();

    // Best-effort identity so members can reach their own private mocks; the
    // route is public, so an absent/invalid token just means "anonymous".
    let userId: string | undefined;
    try {
      await auth.check();
      userId = auth.user?.id;
    } catch {
      userId = undefined;
    }

    try {
      const { statusCode, body, headers } = await MockService.resolveMock(
        params.projectSlug,
        method,
        incomingPath,
        request,
        start,
        userId
      );
      for (const [key, value] of Object.entries(headers)) {
        response.header(key, value);
      }
      return response.status(statusCode).json(body);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
