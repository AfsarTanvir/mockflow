import type { HttpContext } from '@adonisjs/core/http';
import Endpoint from '../models/endpoint.js';
import EndpointScenario from '../models/endpoint_scenario.js';
import Project from '../models/project.js';
import TeamMember from '../models/team_member.js';
import {
  createScenarioValidator,
  updateScenarioValidator,
  hasAtLeastOneOverride,
  validateDelayRange,
} from '../validators/scenario_validator.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
const ROLE_RANK: Record<TeamRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

async function resolveProjectAccess(projectId: string, userId: string, minRole: TeamRole) {
  const project = await Project.find(projectId);
  if (!project) return { project: null, error: 'not_found' as const };

  let role: TeamRole;
  if (project.ownerId === userId) {
    role = 'owner';
  } else {
    const tm = await TeamMember.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .first();
    if (!tm) return { project: null, error: 'forbidden' as const };
    role = tm.role;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return { project: null, error: 'forbidden' as const };
  }

  return { project, error: null };
}

async function resolveScenarioAccess(scenarioId: string, userId: string, minRole: TeamRole) {
  const scenario = await EndpointScenario.find(scenarioId);
  if (!scenario) return { scenario: null, error: 'not_found' as const };

  const endpoint = await Endpoint.find(scenario.endpointId);
  if (!endpoint) return { scenario: null, error: 'not_found' as const };

  const access = await resolveProjectAccess(endpoint.projectId, userId, minRole);
  if (access.error) return { scenario: null, error: access.error };

  return { scenario, endpoint, error: null };
}

export default class ScenariosController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/endpoints/:endpointId/scenarios
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.endpointId);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProjectAccess(endpoint.projectId, auth.user!.id, 'viewer');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const scenarios = await EndpointScenario.query()
      .where('endpoint_id', endpoint.id)
      .orderBy('priority', 'asc')
      .orderBy('created_at', 'asc');

    return response.ok(scenarios);
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/endpoints/:endpointId/scenarios
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const endpoint = await Endpoint.find(params.endpointId);
    if (!endpoint) return response.notFound({ message: 'Endpoint not found' });

    const { error } = await resolveProjectAccess(endpoint.projectId, auth.user!.id, 'member');
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(createScenarioValidator);

    if (!hasAtLeastOneOverride(data as Record<string, unknown>)) {
      return response.unprocessableEntity({
        message: 'Scenario must override at least one field (statusCode, responseBody, responseHeaders, delayMs, or delayMaxMs)',
      });
    }

    const delayError = validateDelayRange(data.delayMs, data.delayMaxMs);
    if (delayError) return response.unprocessableEntity({ message: delayError });

    const duplicate = await EndpointScenario.query()
      .where('endpoint_id', endpoint.id)
      .where('name', data.name)
      .first();
    if (duplicate) {
      return response.conflict({ message: `Scenario "${data.name}" already exists for this endpoint` });
    }

    const scenario = await EndpointScenario.create({
      endpointId: endpoint.id,
      name: data.name,
      description: data.description ?? null,
      statusCode: data.statusCode ?? null,
      responseBody: data.responseBody ?? null,
      responseHeaders: data.responseHeaders ?? null,
      delayMs: data.delayMs ?? null,
      delayMaxMs: data.delayMaxMs ?? null,
      priority: data.priority ?? 0,
      isActive: false,
    });

    return response.created(scenario);
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/scenarios/:id
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const { scenario, error } = await resolveScenarioAccess(params.id, auth.user!.id, 'viewer');
    if (error === 'not_found') return response.notFound({ message: 'Scenario not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    return response.ok(scenario);
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/scenarios/:id
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const { scenario, error } = await resolveScenarioAccess(params.id, auth.user!.id, 'member');
    if (error === 'not_found') return response.notFound({ message: 'Scenario not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(updateScenarioValidator);

    const finalDelayMs = data.delayMs !== undefined ? data.delayMs : scenario!.delayMs;
    const finalDelayMaxMs = data.delayMaxMs !== undefined ? data.delayMaxMs : scenario!.delayMaxMs;
    const delayError = validateDelayRange(finalDelayMs, finalDelayMaxMs);
    if (delayError) return response.unprocessableEntity({ message: delayError });

    if (data.name !== undefined && data.name !== scenario!.name) {
      const duplicate = await EndpointScenario.query()
        .where('endpoint_id', scenario!.endpointId)
        .where('name', data.name)
        .whereNot('id', scenario!.id)
        .first();
      if (duplicate) {
        return response.conflict({ message: `Scenario "${data.name}" already exists for this endpoint` });
      }
    }

    scenario!.merge({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.statusCode !== undefined && { statusCode: data.statusCode }),
      ...(data.responseBody !== undefined && { responseBody: data.responseBody }),
      ...(data.responseHeaders !== undefined && { responseHeaders: data.responseHeaders }),
      ...(data.delayMs !== undefined && { delayMs: data.delayMs }),
      ...(data.delayMaxMs !== undefined && { delayMaxMs: data.delayMaxMs }),
      ...(data.priority !== undefined && { priority: data.priority }),
    });

    await scenario!.save();

    return response.ok(scenario);
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/scenarios/:id
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const { scenario, error } = await resolveScenarioAccess(params.id, auth.user!.id, 'member');
    if (error === 'not_found') return response.notFound({ message: 'Scenario not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    await scenario!.delete();

    return response.ok({ message: 'Scenario deleted' });
  }
}
