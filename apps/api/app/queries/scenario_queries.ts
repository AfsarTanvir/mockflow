import EndpointScenario from '#models/endpoint_scenario';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `endpoint_scenarios`. Pure reads + scoped writes; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return EndpointScenario.find(id, { client });
}

export function listForEndpoint(endpointId: string, client?: TransactionClientContract) {
  return EndpointScenario.query({ client })
    .where('endpoint_id', endpointId)
    .orderBy('priority', 'asc')
    .orderBy('created_at', 'asc');
}

/** A scenario on the endpoint with the given name, optionally excluding one id. */
export function findByEndpointAndName(
  endpointId: string,
  name: string,
  excludeId?: string,
  client?: TransactionClientContract
) {
  const query = EndpointScenario.query({ client })
    .where('endpoint_id', endpointId)
    .where('name', name);
  if (excludeId) {
    query.whereNot('id', excludeId);
  }
  return query.first();
}

/** Clear is_active on every sibling scenario except `exceptId`. */
export function deactivateSiblings(
  endpointId: string,
  exceptId: string,
  client?: TransactionClientContract
) {
  return EndpointScenario.query({ client })
    .where('endpoint_id', endpointId)
    .whereNot('id', exceptId)
    .update({ is_active: false });
}

/** Clear is_active on every currently-active scenario for the endpoint. Returns affected count. */
export function deactivateAllActive(endpointId: string, client?: TransactionClientContract) {
  return EndpointScenario.query({ client })
    .where('endpoint_id', endpointId)
    .where('is_active', true)
    .update({ is_active: false });
}
