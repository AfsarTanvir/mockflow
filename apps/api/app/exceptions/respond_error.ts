import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';

/**
 * Map a service-thrown {@link Exception} (carrying an HTTP `status`) to the
 * API's standard `{ message }` error response. Anything that is not such an
 * Exception is re-thrown so the global exception handler can deal with it.
 *
 * Lets controllers stay thin:
 *
 *   try {
 *     return response.ok(await SomeService.doThing(...));
 *   } catch (error) {
 *     return respondError(error, response);
 *   }
 */
export function respondError(error: unknown, response: HttpContext['response']) {
  if (error instanceof Exception && typeof error.status === 'number') {
    return response.status(error.status).json({ message: error.message });
  }
  throw error;
}
