import type { HttpContext } from '@adonisjs/core/http';
import Endpoint from '../models/endpoint.js';
import Project from '../models/project.js';
import TeamMember from '../models/team_member.js';
import {
  createEndpointValidator,
  updateEndpointValidator,
  validateEndpointDelayRange,
} from '../validators/endpoint_validator.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
const ROLE_RANK: Record<TeamRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

async function resolveProject(projectId: string, userId: string, minRole: TeamRole = 'viewer') {
  const project = await Project.find(projectId);
  if (!project) return { project: null, role: null, error: 'not_found' as const };

  let role: TeamRole;
  if (project.ownerId === userId) {
    role = 'owner';
  } else {
    const tm = await TeamMember.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .first();
    if (!tm) return { project: null, role: null, error: 'forbidden' as const };
    role = tm.role;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return { project: null, role: null, error: 'forbidden' as const };
  }

  return { project, role, error: null };
}

export default class EndpointsController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/projects/:projectId/endpoints
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const { project, error } = await resolveProject(params.projectId, auth.user!.id, 'viewer');
    if (error === 'not_found') return response.notFound({ message: 'Project not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const endpoints = await Endpoint.query()
      .where('project_id', project!.id)
      .orderBy('created_at', 'asc');

    return response.ok(endpoints);
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/projects/:projectId/endpoints
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const { project, error } = await resolveProject(params.projectId, auth.user!.id, 'member');
    if (error === 'not_found') return response.notFound({ message: 'Project not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(createEndpointValidator);

    const delayError = validateEndpointDelayRange(data.delayMs, data.delayMaxMs);
    if (delayError) return response.unprocessableEntity({ message: delayError });

    const existing = await Endpoint.query()
      .where('project_id', project!.id)
      .where('method', data.method)
      .where('path', data.path)
      .first();

    if (existing) {
      return response.conflict({ message: `${data.method} ${data.path} already exists` });
    }

    const endpoint = await Endpoint.create({
      projectId: project!.id,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode ?? 200,
      responseBody: data.responseBody ?? null,
      responseHeaders: data.responseHeaders ?? {},
      delayMs: data.delayMs ?? 0,
      delayMaxMs: data.delayMaxMs ?? null,
      isActive: data.isActive ?? true,
      createdBy: auth.user!.id,
    });

    return response.created(endpoint);
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/endpoints/:id
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.id);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProject(endpoint.projectId, auth.user!.id, 'viewer');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    return response.ok(endpoint);
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/endpoints/:id
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.id);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProject(endpoint.projectId, auth.user!.id, 'member');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(updateEndpointValidator);

    const finalDelayMs = data.delayMs !== undefined ? data.delayMs : endpoint.delayMs;
    const finalDelayMaxMs = data.delayMaxMs !== undefined ? data.delayMaxMs : endpoint.delayMaxMs;
    const delayError = validateEndpointDelayRange(finalDelayMs, finalDelayMaxMs);
    if (delayError) return response.unprocessableEntity({ message: delayError });

    const newMethod = data.method ?? endpoint.method;
    const newPath = data.path ?? endpoint.path;

    if (
      (data.method !== undefined || data.path !== undefined) &&
      (newMethod !== endpoint.method || newPath !== endpoint.path)
    ) {
      const conflict = await Endpoint.query()
        .where('project_id', endpoint.projectId)
        .where('method', newMethod)
        .where('path', newPath)
        .whereNot('id', endpoint.id)
        .first();

      if (conflict) {
        return response.conflict({ message: `${newMethod} ${newPath} already exists` });
      }
    }

    endpoint.merge({
      ...(data.method !== undefined && { method: data.method }),
      ...(data.path !== undefined && { path: data.path }),
      ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
      ...(data.responseBody !== undefined && { responseBody: data.responseBody }),
      ...(data.responseHeaders !== undefined && { responseHeaders: data.responseHeaders }),
      ...(data.delayMs !== undefined && { delayMs: data.delayMs }),
      ...(data.delayMaxMs !== undefined && { delayMaxMs: data.delayMaxMs }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    await endpoint.save();

    return response.ok(endpoint);
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/endpoints/:id
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.id);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProject(endpoint.projectId, auth.user!.id, 'member');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    await endpoint.delete();

    return response.ok({ message: 'Endpoint deleted' });
  }

  /*
  |--------------------------------------------------------------------------
  | Toggle - PATCH /api/endpoints/:id/toggle
  |--------------------------------------------------------------------------
  */
  async toggle({ auth, params, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.id);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProject(endpoint.projectId, auth.user!.id, 'member');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    endpoint.isActive = !endpoint.isActive;
    await endpoint.save();

    return response.ok(endpoint);
  }
}
