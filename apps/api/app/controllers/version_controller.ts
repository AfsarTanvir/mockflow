import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';
import db from '@adonisjs/lucid/services/db';
import Project from '../models/project.js';
import Endpoint from '../models/endpoint.js';
import TeamMember from '../models/team_member.js';
import VersionHistory from '../models/version_history.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_RANK: Record<TeamRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

async function resolveAccess(
  projectId: string,
  userId: string,
  minRole: TeamRole
): Promise<{ project: Project; role: TeamRole }> {
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
    role = tm.role;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Exception('Insufficient permissions', { status: 403 });
  }

  return { project, role };
}

export default class VersionController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/projects/:projectId/versions
  | All team members can view version history.
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    await resolveAccess(params.projectId, auth.user!.id, 'viewer');

    const versions = await VersionHistory.query()
      .where('project_id', params.projectId)
      .preload('author')
      .orderBy('created_at', 'desc')
      .limit(50);

    return response.ok(
      versions.map((v) => ({
        id: v.id,
        message: v.message,
        createdAt: v.createdAt,
        createdBy: v.author ? { id: v.author.id, name: v.author.name } : null,
        endpointCount: (v.snapshot.endpoints ?? []).length,
      }))
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/projects/:projectId/versions
  | Owner/admin only. Captures current project + endpoints as a snapshot.
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const { project } = await resolveAccess(params.projectId, auth.user!.id, 'admin');

    const message: string | null = request.input('message', null);

    const endpoints = await Endpoint.query()
      .where('project_id', project.id)
      .orderBy('created_at', 'asc');

    const snapshot = {
      project: {
        name: project.name,
        slug: project.slug,
        basePath: project.basePath,
        isPublic: project.isPublic,
        settings: project.settings,
      },
      endpoints: endpoints.map((e) => ({
        method: e.method,
        path: e.path,
        statusCode: e.statusCode,
        responseBody: e.responseBody,
        responseHeaders: e.responseHeaders,
        delayMs: e.delayMs,
        isActive: e.isActive,
      })),
    };

    const version = await VersionHistory.create({
      projectId: project.id,
      snapshot,
      message,
      createdBy: auth.user!.id,
    });

    return response.created({
      id: version.id,
      message: version.message,
      createdAt: version.createdAt,
      endpointCount: snapshot.endpoints.length,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/projects/:projectId/versions/:id
  | Returns full snapshot so the UI can preview endpoint list.
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    await resolveAccess(params.projectId, auth.user!.id, 'viewer');

    const version = await VersionHistory.query()
      .where('project_id', params.projectId)
      .where('id', params.id)
      .preload('author')
      .firstOrFail();

    return response.ok({
      id: version.id,
      message: version.message,
      createdAt: version.createdAt,
      createdBy: version.author ? { id: version.author.id, name: version.author.name } : null,
      snapshot: version.snapshot,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Restore - POST /api/projects/:projectId/versions/:id/restore
  | Owner/admin only. Replaces current endpoints with snapshot inside a tx.
  |--------------------------------------------------------------------------
  */
  async restore({ auth, params, response }: HttpContext) {
    const { project } = await resolveAccess(params.projectId, auth.user!.id, 'admin');

    const version = await VersionHistory.query()
      .where('project_id', project.id)
      .where('id', params.id)
      .firstOrFail();

    const { snapshot } = version;

    await db.transaction(async (trx) => {
      project.useTransaction(trx);
      project.name = snapshot.project.name;
      project.basePath = snapshot.project.basePath;
      project.isPublic = snapshot.project.isPublic;
      project.settings = snapshot.project.settings;
      await project.save();

      await Endpoint.query({ client: trx }).where('project_id', project.id).delete();

      for (const ep of snapshot.endpoints) {
        await Endpoint.create(
          {
            projectId: project.id,
            method: ep.method,
            path: ep.path,
            statusCode: ep.statusCode,
            responseBody: ep.responseBody,
            responseHeaders: ep.responseHeaders,
            delayMs: ep.delayMs,
            isActive: ep.isActive,
            createdBy: auth.user!.id,
          },
          { client: trx }
        );
      }
    });

    return response.ok({
      message: 'Project restored to selected version',
      versionId: version.id,
      endpointCount: snapshot.endpoints.length,
    });
  }
}
