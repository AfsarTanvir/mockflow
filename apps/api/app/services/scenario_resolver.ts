import EndpointScenario from '../models/endpoint_scenario.js'

/**
 * Picks the scenario that should drive a given request, if any.
 *
 * Resolution order:
 *   1. (Day 49) First scenario whose rules ALL match the request — rule-based.
 *   2. The scenario manually marked is_active = true.
 *   3. null — fall back to the endpoint's default response.
 */
export async function resolveScenario(endpointId: string): Promise<EndpointScenario | null> {
  const scenarios = await EndpointScenario.query()
    .where('endpoint_id', endpointId)
    .orderBy('priority', 'asc')
    .orderBy('created_at', 'asc')

  // Day 49 — rule-based selection will go here.

  return scenarios.find((s) => s.isActive) ?? null
}
