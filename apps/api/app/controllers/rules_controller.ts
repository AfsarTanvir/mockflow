import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as RuleService from '#services/rule_service';
import { createRuleValidator, updateRuleValidator } from '#validators/rule_validator';

export default class RulesController {
  /** GET /api/scenarios/:scenarioId/rules */
  async index({ auth, params, response }: HttpContext) {
    try {
      const rules = await RuleService.listForScenario(params.scenarioId, auth.user!.id);
      return response.ok(rules);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/scenarios/:scenarioId/rules */
  async store({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createRuleValidator);
    try {
      const rule = await RuleService.createRule(params.scenarioId, auth.user!.id, data);
      return response.created(rule);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PUT /api/rules/:id */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateRuleValidator);
    try {
      const rule = await RuleService.updateRule(params.id, auth.user!.id, data);
      return response.ok(rule);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/rules/:id */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      await RuleService.deleteRule(params.id, auth.user!.id);
      return response.ok({ message: 'Rule deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
