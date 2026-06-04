import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as ScenarioService from '#services/scenario_service';
import { createScenarioValidator, updateScenarioValidator } from '#validators/scenario_validator';

export default class ScenariosController {
  /** GET /api/endpoints/:endpointId/scenarios */
  async index({ auth, params, response }: HttpContext) {
    try {
      const scenarios = await ScenarioService.listForEndpoint(params.endpointId, auth.user!.id);
      return response.ok(scenarios);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/endpoints/:endpointId/scenarios */
  async store({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createScenarioValidator);
    try {
      const scenario = await ScenarioService.createScenario(params.endpointId, auth.user!.id, data);
      return response.created(scenario);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/scenarios/:id */
  async show({ auth, params, response }: HttpContext) {
    try {
      const scenario = await ScenarioService.getScenario(params.id, auth.user!.id);
      return response.ok(scenario);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PUT /api/scenarios/:id */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateScenarioValidator);
    try {
      const scenario = await ScenarioService.updateScenario(params.id, auth.user!.id, data);
      return response.ok(scenario);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/scenarios/:id */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      await ScenarioService.deleteScenario(params.id, auth.user!.id);
      return response.ok({ message: 'Scenario deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/scenarios/:id/activate */
  async activate({ auth, params, response }: HttpContext) {
    try {
      const scenario = await ScenarioService.activateScenario(params.id, auth.user!.id);
      return response.ok(scenario);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/endpoints/:endpointId/scenarios/deactivate-all */
  async deactivateAll({ auth, params, response }: HttpContext) {
    try {
      const deactivated = await ScenarioService.deactivateAllForEndpoint(
        params.endpointId,
        auth.user!.id
      );
      return response.ok({ deactivated });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
