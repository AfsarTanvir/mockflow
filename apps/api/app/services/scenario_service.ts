import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import EndpointScenario from '#models/endpoint_scenario';
import * as AccessService from '#services/access_service';
import * as ScenarioQueries from '#queries/scenario_queries';
import { hasAtLeastOneOverride, validateDelayRange } from '#validators/scenario_validator';
import type {
  createScenarioValidator,
  updateScenarioValidator,
} from '#validators/scenario_validator';

export type CreateScenarioInput = Infer<typeof createScenarioValidator>;
export type UpdateScenarioInput = Infer<typeof updateScenarioValidator>;

/** List an endpoint's scenarios (priority then creation order). Viewer+. */
export async function listForEndpoint(endpointId: string, userId: string) {
  await AccessService.assertEndpointAccess(endpointId, userId, 'viewer');
  return ScenarioQueries.listForEndpoint(endpointId);
}

/** Create a scenario. Member+. Requires at least one override and a unique name. */
export async function createScenario(
  endpointId: string,
  userId: string,
  input: CreateScenarioInput
): Promise<EndpointScenario> {
  await AccessService.assertEndpointAccess(endpointId, userId, 'member');

  if (!hasAtLeastOneOverride(input as Record<string, unknown>)) {
    throw new Exception(
      'Scenario must override at least one field (statusCode, responseBody, responseHeaders, delayMs, or delayMaxMs)',
      { status: 422, code: 'E_NO_OVERRIDE' }
    );
  }

  const delayError = validateDelayRange(input.delayMs, input.delayMaxMs);
  if (delayError) {
    throw new Exception(delayError, { status: 422, code: 'E_DELAY_RANGE' });
  }

  const duplicate = await ScenarioQueries.findByEndpointAndName(endpointId, input.name);
  if (duplicate) {
    throw new Exception(`Scenario "${input.name}" already exists for this endpoint`, {
      status: 409,
      code: 'E_CONFLICT',
    });
  }

  return EndpointScenario.create({
    endpointId,
    name: input.name,
    description: input.description ?? null,
    statusCode: input.statusCode ?? null,
    responseBody: input.responseBody ?? null,
    responseHeaders: input.responseHeaders ?? null,
    delayMs: input.delayMs ?? null,
    delayMaxMs: input.delayMaxMs ?? null,
    priority: input.priority ?? 0,
    isActive: false,
  });
}

/** A single scenario. Viewer+. */
export async function getScenario(scenarioId: string, userId: string): Promise<EndpointScenario> {
  const { scenario } = await AccessService.assertScenarioAccess(scenarioId, userId, 'viewer');
  return scenario;
}

/** Update a scenario. Member+. Re-checks delay range and name uniqueness. */
export async function updateScenario(
  scenarioId: string,
  userId: string,
  input: UpdateScenarioInput
): Promise<EndpointScenario> {
  const { scenario } = await AccessService.assertScenarioAccess(scenarioId, userId, 'member');

  const finalDelayMs = input.delayMs !== undefined ? input.delayMs : scenario.delayMs;
  const finalDelayMaxMs = input.delayMaxMs !== undefined ? input.delayMaxMs : scenario.delayMaxMs;
  const delayError = validateDelayRange(finalDelayMs, finalDelayMaxMs);
  if (delayError) {
    throw new Exception(delayError, { status: 422, code: 'E_DELAY_RANGE' });
  }

  if (input.name !== undefined && input.name !== scenario.name) {
    const duplicate = await ScenarioQueries.findByEndpointAndName(
      scenario.endpointId,
      input.name,
      scenario.id
    );
    if (duplicate) {
      throw new Exception(`Scenario "${input.name}" already exists for this endpoint`, {
        status: 409,
        code: 'E_CONFLICT',
      });
    }
  }

  scenario.merge({
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.statusCode !== undefined && { statusCode: input.statusCode }),
    ...(input.responseBody !== undefined && { responseBody: input.responseBody }),
    ...(input.responseHeaders !== undefined && { responseHeaders: input.responseHeaders }),
    ...(input.delayMs !== undefined && { delayMs: input.delayMs }),
    ...(input.delayMaxMs !== undefined && { delayMaxMs: input.delayMaxMs }),
    ...(input.priority !== undefined && { priority: input.priority }),
  });
  await scenario.save();

  return scenario;
}

/** Delete a scenario. Member+. */
export async function deleteScenario(scenarioId: string, userId: string): Promise<void> {
  const { scenario } = await AccessService.assertScenarioAccess(scenarioId, userId, 'member');
  await scenario.delete();
}

/**
 * Activate a scenario (mutually exclusive): deactivate all siblings then
 * activate this one, atomically. Member+. Idempotent.
 */
export async function activateScenario(
  scenarioId: string,
  userId: string
): Promise<EndpointScenario> {
  const { scenario } = await AccessService.assertScenarioAccess(scenarioId, userId, 'member');

  await db.transaction(async (trx) => {
    await ScenarioQueries.deactivateSiblings(scenario.endpointId, scenario.id, trx);
    scenario.useTransaction(trx);
    scenario.isActive = true;
    await scenario.save();
  });

  return scenario;
}

/** Clear the active flag from every scenario on an endpoint. Member+. Returns affected count. */
export async function deactivateAllForEndpoint(
  endpointId: string,
  userId: string
): Promise<number> {
  await AccessService.assertEndpointAccess(endpointId, userId, 'member');
  const affected = await ScenarioQueries.deactivateAllActive(endpointId);
  return Array.isArray(affected) ? affected.length : affected;
}
