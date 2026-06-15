import Endpoint from '#models/endpoint';
import EndpointScenario from '#models/endpoint_scenario';
import * as ProjectQueries from '#queries/project_queries';
import type { RuleSource, RuleOperator } from '#models/scenario_rule';

/**
 * A "mock blueprint" is everything needed to resolve ANY request for a project,
 * in one cacheable JSON document: project settings + active endpoints + each
 * endpoint's scenarios + rules (ordered for resolution). resolveMock reads this
 * from cache and matches/evaluates entirely in memory — no per-request DB work.
 */

export interface BlueprintRule {
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value: string | null;
}

export interface BlueprintScenario {
  name: string;
  statusCode: number | null;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string> | null;
  delayMs: number | null;
  delayMaxMs: number | null;
  isActive: boolean;
  priority: number;
  rules: BlueprintRule[];
}

export interface BlueprintEndpoint {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  delayMaxMs: number | null;
  scenarios: BlueprintScenario[];
}

export interface MockBlueprint {
  settings: { cors: boolean; log_requests: boolean; global_headers?: Record<string, string> };
  endpoints: BlueprintEndpoint[];
}

/**
 * Build the blueprint from Postgres. Returns null if the project is gone.
 * Uses two queries total (active endpoints, then their scenarios+rules via a
 * single whereIn preload) — no N+1.
 */
export async function buildBlueprint(projectId: string): Promise<MockBlueprint | null> {
  const project = await ProjectQueries.findById(projectId);
  if (!project) return null;

  const endpoints = await Endpoint.query()
    .where('project_id', projectId)
    .where('is_active', true)
    .orderBy('created_at', 'asc');

  const endpointIds = endpoints.map((e) => e.id);
  const scenarios = endpointIds.length
    ? await EndpointScenario.query()
        .whereIn('endpoint_id', endpointIds)
        .preload('rules')
        .orderBy('priority', 'asc')
        .orderBy('created_at', 'asc')
    : [];

  const byEndpoint = new Map<string, BlueprintScenario[]>();
  for (const s of scenarios) {
    const list = byEndpoint.get(s.endpointId) ?? [];
    list.push({
      name: s.name,
      statusCode: s.statusCode,
      responseBody: s.responseBody,
      responseHeaders: s.responseHeaders,
      delayMs: s.delayMs,
      delayMaxMs: s.delayMaxMs,
      isActive: s.isActive,
      priority: s.priority,
      rules: (s.rules ?? []).map((r) => ({
        source: r.source,
        field: r.field,
        operator: r.operator,
        value: r.value,
      })),
    });
    byEndpoint.set(s.endpointId, list);
  }

  return {
    settings: project.settings,
    endpoints: endpoints.map((e) => ({
      id: e.id,
      method: e.method,
      path: e.path,
      statusCode: e.statusCode,
      responseBody: e.responseBody,
      responseHeaders: e.responseHeaders,
      delayMs: e.delayMs,
      delayMaxMs: e.delayMaxMs,
      scenarios: byEndpoint.get(e.id) ?? [],
    })),
  };
}
