import type { HttpContext } from '@adonisjs/core/http';
import type { RuleSource, RuleOperator } from '#models/scenario_rule';
import type { BlueprintScenario } from '#services/mock_blueprint';

/** Structural rule shape — satisfied by both ScenarioRule models and blueprint rules. */
export interface RuleLike {
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value: string | null;
}

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

export function evalRule(rule: RuleLike, request: HttpContext['request']): boolean {
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
 * Pick the scenario that should drive a request, from a blueprint's in-memory
 * scenario list (already ordered priority-asc, created-asc).
 *
 * Resolution order:
 *   1. Rule-based — first scenario whose rules ALL match (zero-rule scenarios skipped).
 *   2. The scenario manually marked is_active = true.
 *   3. null — fall back to the endpoint's default response.
 */
export function pickScenario(
  scenarios: BlueprintScenario[],
  request: HttpContext['request']
): BlueprintScenario | null {
  for (const s of scenarios) {
    if (s.rules.length > 0 && s.rules.every((r) => evalRule(r, request))) {
      return s;
    }
  }
  return scenarios.find((s) => s.isActive) ?? null;
}
