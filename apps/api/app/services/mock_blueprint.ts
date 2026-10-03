import Endpoint from '#models/endpoint';
import EndpointScenario from '#models/endpoint_scenario';
import * as ProjectQueries from '#queries/project_queries';
import * as TeamQueries from '#queries/team_queries';
import { cacheTags } from '#services/cache_keys';
import { normalizeBasePath } from '#services/base_path';
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

/** Which project/team/company a blueprint belongs to — drives its cache tags. */
export interface BlueprintScope {
  projectId: string;
  teamId: string | null;
  companyId: string | null;
}

export interface MockBlueprint {
  scope: BlueprintScope;
  /** Normalized prefix ('' = root) every endpoint path sits under. */
  basePath: string;
  isPublic: boolean;
  settings: { cors: boolean; log_requests: boolean; global_headers?: Record<string, string> };
  endpoints: BlueprintEndpoint[];
}

/**
 * How specific a single path segment is. Lower wins: a literal beats a named
 * parameter, which beats anything that can swallow multiple segments.
 */
function segmentRank(segment: string): number {
  if (segment === '*' || segment.startsWith('(')) return 2;
  if (segment.startsWith(':')) {
    // `:id?`, `:id*`, `:id+` are variable-width — the loosest kind of match.
    return /[?*+]$/.test(segment) ? 2 : 1;
  }
  return 0;
}

/**
 * Order two path patterns most-specific-first, comparing segment by segment.
 *
 * Matching is first-match-wins, so without this an endpoint created earlier
 * shadows any later one it happens to match: `/users/:id` added before
 * `/users/me` made the literal route permanently unreachable, with nothing in
 * the UI to explain why. Definition order is a fine rule when the author
 * controls it, but here it is `created_at`, which is neither visible nor
 * reorderable.
 *
 * Only colliding patterns matter — if two patterns never match the same path,
 * their relative order is irrelevant. Ties keep creation order, since
 * Array#sort is stable and the input is already ordered by `created_at`.
 */
export function compareSpecificity(a: string, b: string): number {
  const aSegments = a.split('/').filter(Boolean);
  const bSegments = b.split('/').filter(Boolean);

  for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i += 1) {
    const diff = segmentRank(aSegments[i]!) - segmentRank(bSegments[i]!);
    if (diff !== 0) return diff;
  }

  // Same ranks so far: the longer pattern is the more specific one (a trailing
  // wildcard should not outrank a route that spells the segments out).
  return bSegments.length - aSegments.length;
}

/** Resolve a project's owning team/company (company only exists for team projects). */
export async function projectScope(project: {
  id: string;
  teamId: string | null;
}): Promise<BlueprintScope> {
  const team = project.teamId ? await TeamQueries.findById(project.teamId) : null;
  return { projectId: project.id, teamId: team?.id ?? null, companyId: team?.companyId ?? null };
}

/** Cache tags for anything cached on behalf of a project. */
export function scopeTags(scope: BlueprintScope): string[] {
  const tags = [cacheTags.project(scope.projectId)];
  if (scope.teamId) tags.push(cacheTags.team(scope.teamId));
  if (scope.companyId) tags.push(cacheTags.company(scope.companyId));
  return tags;
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
    scope: await projectScope(project),
    basePath: normalizeBasePath(project.basePath),
    isPublic: project.isPublic,
    settings: project.settings,
    // Sorted once here rather than per request: the blueprint is the cached
    // artifact, and resolveMock just takes the first match.
    endpoints: endpoints
      .map((e) => ({
        id: e.id,
        method: e.method,
        path: e.path,
        statusCode: e.statusCode,
        responseBody: e.responseBody,
        responseHeaders: e.responseHeaders,
        delayMs: e.delayMs,
        delayMaxMs: e.delayMaxMs,
        scenarios: byEndpoint.get(e.id) ?? [],
      }))
      .sort((a, b) => compareSpecificity(a.path, b.path)),
  };
}
