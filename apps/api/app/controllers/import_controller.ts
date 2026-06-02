import { readFile } from 'node:fs/promises';
import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import db from '@adonisjs/lucid/services/db';
import Project from '../models/project.js';
import Endpoint from '../models/endpoint.js';
import TeamMember from '../models/team_member.js';
import { parseOpenApiSpec } from '../services/openapi_importer.js';
import { parsePostmanCollection } from '../services/postman_importer.js';
import { applyImportValidator } from '../validators/import_validator.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_RANK: Record<TeamRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

async function resolveAccess(
  projectId: string,
  userId: string,
  minRole: TeamRole
): Promise<Project> {
  const project = await Project.find(projectId);
  if (!project) throw new Exception('Project not found', { status: 404 });

  let role: TeamRole;
  if (project.ownerId === userId) {
    role = 'owner';
  } else {
    const tm = await TeamMember.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .first();
    if (!tm) throw new Exception('Access denied', { status: 403 });
    role = tm.role as TeamRole;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Exception('Insufficient permissions', { status: 403 });
  }

  return project;
}

export default class ImportController {
  /*
  |--------------------------------------------------------------------------
  | OpenAPI Preview — POST /api/projects/:id/import/openapi/preview
  | Admin+ only. Parses the uploaded file, returns endpoints + conflicts.
  | Does NOT write to DB.
  |--------------------------------------------------------------------------
  */
  async openapiPreview({ auth, params, request, response }: HttpContext) {
    const project = await resolveAccess(params.id, auth.user!.id, 'admin');

    const file = request.file('file', { extnames: ['json'], size: '20mb' });
    if (!file) return response.badRequest({ message: 'No file provided' });
    if (!file.isValid) return response.unprocessableEntity({ errors: file.errors });

    let raw: unknown;
    try {
      const content = await readFile(file.tmpPath!, 'utf-8');
      raw = JSON.parse(content);
    } catch {
      return response.unprocessableEntity({ message: 'Could not read or parse the JSON file' });
    }

    const result = parseOpenApiSpec(raw);
    if ('error' in result) return response.unprocessableEntity({ message: result.error });

    const existing = await Endpoint.query().where('project_id', project.id);
    const existingMap = new Map(existing.map((e) => [`${e.method} ${e.path}`, e]));

    const conflicts = result.endpoints
      .filter((ep) => existingMap.has(`${ep.method} ${ep.path}`))
      .map((ep) => ({
        method: ep.method,
        path: ep.path,
        existingId: existingMap.get(`${ep.method} ${ep.path}`)!.id,
        incoming: ep,
      }));

    return response.ok({
      endpoints: result.endpoints,
      conflicts,
      warnings: result.warnings,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | OpenAPI Apply — POST /api/projects/:id/import/openapi/apply
  | Admin+ only. Inserts/updates endpoints inside a transaction.
  |--------------------------------------------------------------------------
  */
  async openapiApply({ auth, params, request, response }: HttpContext) {
    const project = await resolveAccess(params.id, auth.user!.id, 'admin');

    const data = await request.validateUsing(applyImportValidator);

    const existing = await Endpoint.query().where('project_id', project.id);
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
              createdBy: auth.user!.id,
            },
            { client: trx }
          );
          created++;
        }
      }
    });

    return response.ok({ created, overwritten, skipped, errors: [] });
  }

  /*
  |--------------------------------------------------------------------------
  | Postman Preview — POST /api/projects/:id/import/postman/preview
  |--------------------------------------------------------------------------
  */
  async postmanPreview({ auth, params, request, response }: HttpContext) {
    const project = await resolveAccess(params.id, auth.user!.id, 'admin');

    const file = request.file('file', { extnames: ['json'], size: '20mb' });
    if (!file) return response.badRequest({ message: 'No file provided' });
    if (!file.isValid) return response.unprocessableEntity({ errors: file.errors });

    let raw: unknown;
    try {
      const content = await readFile(file.tmpPath!, 'utf-8');
      raw = JSON.parse(content);
    } catch {
      return response.unprocessableEntity({ message: 'Could not read or parse the JSON file' });
    }

    const result = parsePostmanCollection(raw);
    if ('error' in result) return response.unprocessableEntity({ message: result.error });

    const existing = await Endpoint.query().where('project_id', project.id);
    const existingMap = new Map(existing.map((e) => [`${e.method} ${e.path}`, e]));

    const conflicts = result.endpoints
      .filter((ep) => existingMap.has(`${ep.method} ${ep.path}`))
      .map((ep) => ({
        method: ep.method,
        path: ep.path,
        existingId: existingMap.get(`${ep.method} ${ep.path}`)!.id,
        incoming: ep,
      }));

    return response.ok({
      endpoints: result.endpoints,
      conflicts,
      warnings: result.warnings,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Postman Apply — POST /api/projects/:id/import/postman/apply
  |--------------------------------------------------------------------------
  */
  async postmanApply({ auth, params, request, response }: HttpContext) {
    const project = await resolveAccess(params.id, auth.user!.id, 'admin');

    const data = await request.validateUsing(applyImportValidator);

    const existing = await Endpoint.query().where('project_id', project.id);
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
              createdBy: auth.user!.id,
            },
            { client: trx }
          );
          created++;
        }
      }
    });

    return response.ok({ created, overwritten, skipped, errors: [] });
  }
}
