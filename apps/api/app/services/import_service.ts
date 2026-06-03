import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import Endpoint from '#models/endpoint';
import * as AccessService from '#services/access_service';
import * as EndpointQueries from '#queries/endpoint_queries';
import { parseOpenApiSpec } from '#services/openapi_importer';
import { parsePostmanCollection } from '#services/postman_importer';
import type { applyImportValidator } from '#validators/import_validator';

export type ImportKind = 'openapi' | 'postman';
export type ApplyImportInput = Infer<typeof applyImportValidator>;

function parse(kind: ImportKind, raw: unknown) {
  return kind === 'openapi' ? parseOpenApiSpec(raw) : parsePostmanCollection(raw);
}

/**
 * Parse an uploaded spec and diff it against the project's endpoints.
 * Admin+ only. Does NOT write to the database.
 */
export async function preview(projectId: string, userId: string, raw: unknown, kind: ImportKind) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  const result = parse(kind, raw);
  if ('error' in result) {
    throw new Exception(result.error, { status: 422, code: 'E_IMPORT_PARSE' });
  }

  const existing = await EndpointQueries.listForProject(project.id);
  const existingMap = new Map(existing.map((e) => [`${e.method} ${e.path}`, e]));

  const conflicts = result.endpoints
    .filter((ep) => existingMap.has(`${ep.method} ${ep.path}`))
    .map((ep) => ({
      method: ep.method,
      path: ep.path,
      existingId: existingMap.get(`${ep.method} ${ep.path}`)!.id,
      incoming: ep,
    }));

  return { endpoints: result.endpoints, conflicts, warnings: result.warnings };
}

/**
 * Apply a resolved import: insert new endpoints and overwrite/skip conflicts
 * per the supplied resolutions, atomically. Admin+ only.
 */
export async function apply(projectId: string, userId: string, data: ApplyImportInput) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  const existing = await EndpointQueries.listForProject(project.id);
  const existingMap = new Map(existing.map((e) => [`${e.method} ${e.path}`, e]));

  let created = 0;
  let overwritten = 0;
  let skipped = 0;

  await db.transaction(async (trx) => {
    for (const ep of data.endpoints) {
      const key = `${ep.method} ${ep.path}`;
      const existingEp = existingMap.get(key);

      if (existingEp) {
        const resolution = data.resolutions?.[key] ?? 'skip';
        if (resolution === 'overwrite') {
          existingEp.useTransaction(trx);
          existingEp.merge({
            statusCode: ep.statusCode,
            responseBody: ep.responseBody ?? null,
            responseHeaders: ep.responseHeaders ?? {},
            delayMs: ep.delayMs ?? 0,
            isActive: ep.isActive ?? true,
          });
          await existingEp.save();
          overwritten++;
        } else {
          skipped++;
        }
      } else {
        await Endpoint.create(
          {
            projectId: project.id,
            method: ep.method,
            path: ep.path,
            statusCode: ep.statusCode,
            responseBody: ep.responseBody ?? null,
            responseHeaders: ep.responseHeaders ?? {},
            delayMs: ep.delayMs ?? 0,
            isActive: ep.isActive ?? true,
            createdBy: userId,
          },
          { client: trx }
        );
        created++;
      }
    }
  });

  return { created, overwritten, skipped, errors: [] as string[] };
}
