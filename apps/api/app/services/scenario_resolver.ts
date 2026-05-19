import type { HttpContext } from '@adonisjs/core/http';
import EndpointScenario from '../models/endpoint_scenario.js';
import ScenarioRule from '../models/scenario_rule.js';

/**
 * Walk a body object using dot-notation path (e.g. "user.email" → body.user.email).
 * Returns undefined when any segment is missing.
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function evalRule(rule: ScenarioRule, request: HttpContext['request']): boolean {
  let value: unknown;

  switch (rule.source) {
    case 'header':
      value = request.header(rule.field);
      break;
    case 'query':
      value = request.qs()[rule.field];
      break;
    case 'body':
      value = getByPath(request.body(), rule.field);
      break;
  }

  if (rule.operator === 'exists') {
    return value !== undefined && value !== null && value !== '';
  }

  // equals — coerce both sides to string for comparison
  if (value === undefined || value === null) return false;
  return String(value) === String(rule.value ?? '');
}

/**
 * Picks the scenario that should drive a given request, if any.
 *
 * Resolution order:
 *   1. Rule-based — first scenario (lowest priority first) whose rules ALL match.
 *      Scenarios with zero rules are skipped here.
 *   2. The scenario manually marked is_active = true.
 *   3. null — fall back to the endpoint's default response.
 */
export async function resolveScenario(
  endpointId: string,
  request: HttpContext['request']
): Promise<EndpointScenario | null> {
  const scenarios = await EndpointScenario.query()
    .where('endpoint_id', endpointId)
    .preload('rules' as any)
    .orderBy('priority', 'asc')
    .orderBy('created_at', 'asc');

  // 1. Rule-based — first scenario whose rules ALL pass
  for (const s of scenarios) {
    const rules = (s as unknown as { rules: ScenarioRule[] }).rules ?? [];
    if (rules.length > 0 && rules.every((r) => evalRule(r, request))) {
      return s;
    }
  }

  // 2. Manually activated fallback
  return scenarios.find((s) => s.isActive) ?? null;
}
