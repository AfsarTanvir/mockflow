import type { HttpContext } from '@adonisjs/core/http';
import Endpoint from '../models/endpoint.js';
import EndpointScenario from '../models/endpoint_scenario.js';
import ScenarioRule from '../models/scenario_rule.js';
import Project from '../models/project.js';
import TeamMember from '../models/team_member.js';
import {
  createRuleValidator,
  updateRuleValidator,
  validateRuleCombination,
} from '../validators/rule_validator.js';

type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
const ROLE_RANK: Record<TeamRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

async function resolveScenarioRole(scenarioId: string, userId: string, minRole: TeamRole) {
  const scenario = await EndpointScenario.find(scenarioId);
  if (!scenario) return { scenario: null, error: 'not_found' as const };

  const endpoint = await Endpoint.find(scenario.endpointId);
  if (!endpoint) return { scenario: null, error: 'not_found' as const };

  const project = await Project.find(endpoint.projectId);
  if (!project) return { scenario: null, error: 'not_found' as const };

  let role: TeamRole;
  if (project.ownerId === userId) {
    role = 'owner';
  } else {
    const tm = await TeamMember.query()
      .where('project_id', project.id)
      .where('user_id', userId)
      .first();
    if (!tm) return { scenario: null, error: 'forbidden' as const };
    role = tm.role;
  }

  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return { scenario: null, error: 'forbidden' as const };
  }

  return { scenario, error: null };
}

async function resolveRuleRole(ruleId: string, userId: string, minRole: TeamRole) {
  const rule = await ScenarioRule.find(ruleId);
  if (!rule) return { rule: null, error: 'not_found' as const };

  const access = await resolveScenarioRole(rule.scenarioId, userId, minRole);
  if (access.error) return { rule: null, error: access.error };

  return { rule, error: null };
}

export default class RulesController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/scenarios/:scenarioId/rules
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const { error } = await resolveScenarioRole(params.scenarioId, auth.user!.id, 'viewer');
    if (error === 'not_found') return response.notFound({ message: 'Scenario not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const rules = await ScenarioRule.query()
      .where('scenario_id', params.scenarioId)
      .orderBy('created_at', 'asc');

    return response.ok(rules);
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/scenarios/:scenarioId/rules
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const { scenario, error } = await resolveScenarioRole(
      params.scenarioId,
      auth.user!.id,
      'member'
    );
    if (error === 'not_found') return response.notFound({ message: 'Scenario not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(createRuleValidator);

    const combinationError = validateRuleCombination(data.operator, data.value);
    if (combinationError) return response.unprocessableEntity({ message: combinationError });

    const rule = await ScenarioRule.create({
      scenarioId: scenario!.id,
      source: data.source,
      field: data.field,
      operator: data.operator,
      value: data.operator === 'exists' ? null : (data.value ?? null),
    });

    return response.created(rule);
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/rules/:id
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const { rule, error } = await resolveRuleRole(params.id, auth.user!.id, 'member');
    if (error === 'not_found') return response.notFound({ message: 'Rule not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    const data = await request.validateUsing(updateRuleValidator);

    const finalOperator = data.operator ?? rule!.operator;
    const finalValue = data.value !== undefined ? data.value : rule!.value;
    const combinationError = validateRuleCombination(finalOperator, finalValue);
    if (combinationError) return response.unprocessableEntity({ message: combinationError });

    rule!.merge({
      ...(data.source !== undefined && { source: data.source }),
      ...(data.field !== undefined && { field: data.field }),
      ...(data.operator !== undefined && { operator: data.operator }),
      ...(data.value !== undefined && { value: data.value }),
    });

    // Normalize: if final operator is exists, value must be null
    if (rule!.operator === 'exists') rule!.value = null;

    await rule!.save();

    return response.ok(rule);
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/rules/:id
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const { rule, error } = await resolveRuleRole(params.id, auth.user!.id, 'member');
    if (error === 'not_found') return response.notFound({ message: 'Rule not found' });
    if (error === 'forbidden') return response.forbidden({ message: 'Access denied' });

    await rule!.delete();

    return response.ok({ message: 'Rule deleted' });
  }
}
