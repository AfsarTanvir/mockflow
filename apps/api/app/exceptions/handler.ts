import { ExceptionHandler, HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction;

  async handle(error: unknown, ctx: HttpContext) {
    return super.handle(error, ctx);
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx);
  }
}
