import { readFile } from 'node:fs/promises';
import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ImportService from '#services/import_service';
import { applyImportValidator } from '#validators/import_validator';

export default class ImportController {
  /** POST /api/projects/:id/import/openapi/preview */
  async openapiPreview(ctx: HttpContext) {
    return this.preview(ctx, 'openapi');
  }

  /** POST /api/projects/:id/import/openapi/apply */
  async openapiApply(ctx: HttpContext) {
    return this.apply(ctx);
  }

  /** POST /api/projects/:id/import/postman/preview */
  async postmanPreview(ctx: HttpContext) {
    return this.preview(ctx, 'postman');
  }

  /** POST /api/projects/:id/import/postman/apply */
  async postmanApply(ctx: HttpContext) {
    return this.apply(ctx);
  }

  /** Shared: read + parse the uploaded JSON file, then diff against the project. */
  private async preview(
    { auth, params, request, response }: HttpContext,
    kind: ImportService.ImportKind
  ) {
    const file = request.file('file', { extnames: ['json'], size: '20mb' });
    if (!file) return response.badRequest({ message: 'No file provided' });
    if (!file.isValid) return response.unprocessableEntity({ errors: file.errors });

    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file.tmpPath!, 'utf-8'));
    } catch {
      return response.unprocessableEntity({ message: 'Could not read or parse the JSON file' });
    }

    try {
      const result = await ImportService.preview(params.id, auth.user!.id, raw, kind);
      return response.ok(result);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** Shared: apply a resolved import (identical for OpenAPI and Postman). */
  private async apply({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(applyImportValidator);
    try {
      const result = await ImportService.apply(params.id, auth.user!.id, data);
      return response.ok(result);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
