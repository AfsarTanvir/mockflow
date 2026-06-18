import { match } from 'path-to-regexp';
import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';
import RequestLog from '#models/request_log';
import * as ProjectQueries from '#queries/project_queries';
import * as AccessService from '#services/access_service';
import * as cache from '#services/cache_service';
import { cacheKeys } from '#services/cache_keys';
import { CACHE_TTL } from '#services/cache_service';
import { buildBlueprint, type BlueprintEndpoint } from '#services/mock_blueprint';
import { pickScenario } from '#services/scenario_resolver';
import { evaluateBody } from '#services/faker_evaluator';

export interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

function pickDelay(min: number, max: number | null): number {
  if (max == null || max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const notFound = (slug: string) =>
  new Exception(`No project with slug "${slug}"`, { status: 404, code: 'E_PROJECT_NOT_FOUND' });

/**
 * Resolve a mock request to a concrete response. Reads are served from a cached
 * per-project "blueprint" (settings + active endpoints + scenarios + rules);
 * matching and scenario selection happen entirely in memory. Falls back to
 * Postgres transparently when the cache misses or Redis is unavailable.
 *
 * `now` is the request-start timestamp (ms) for the X-MockFlow-Elapsed header.
 */
export async function resolveMock(
  projectSlug: string,
  method: string,
  incomingPath: string,
  request: HttpContext['request'],
  now: number,
  userId?: string
): Promise<MockResponse> {
  // 1. Resolve slug → projectId (cached; loader returns null when absent). The
  //    slug→id mapping is immutable for a project's lifetime, so it never needs
  //    invalidation except on delete.
  const projectId = await cache.remember<string | null>(
    cacheKeys.mockSlug(projectSlug),
    CACHE_TTL.mock,
    async () => {
      const p = await ProjectQueries.findBySlug(projectSlug);
      return p ? p.id : null;
    },
    // Briefly remember unknown slugs so bad/guessed slugs don't hit the DB every time.
    { negativeTtl: 30 }
  );
  if (!projectId) throw notFound(projectSlug);

  // 2. Per-project blueprint (cached). The loader only runs on a miss, which we
  //    use to report cache hit/miss back to the client.
  let cacheStatus: 'hit' | 'miss' = 'hit';
  const blueprint = await cache.remember(
    cacheKeys.mockBlueprint(projectId),
    CACHE_TTL.mock,
    async () => {
      cacheStatus = 'miss';
      return buildBlueprint(projectId);
    }
  );
  if (!blueprint) throw notFound(projectSlug);

  // 3. Private projects: members only. Return 404 (not 403) so existence stays
  //    hidden. isPublic lives in the blueprint, so it stays in sync on update.
  if (!blueprint.isPublic) {
    const project = userId ? await ProjectQueries.findById(projectId) : null;
    const role = project && userId ? await AccessService.resolveProjectRole(project, userId) : null;
    if (!role) throw notFound(projectSlug);
  }

  // 4. Match an active endpoint by method + path (in memory).
  let matched: BlueprintEndpoint | null = null;
  let pathParams: Record<string, string> = {};
  for (const endpoint of blueprint.endpoints) {
    if (endpoint.method !== method) continue;
    const result = match(endpoint.path, { decode: decodeURIComponent })(incomingPath);
    if (result) {
      matched = endpoint;
      pathParams = result.params as Record<string, string>;
      break;
    }
  }
  if (!matched) {
    throw new Exception(`No active ${method} endpoint matching "${incomingPath}"`, {
      status: 404,
      code: 'E_ENDPOINT_NOT_FOUND',
    });
  }

  // 5. Scenario selection (rule-based, then manual active, else endpoint default).
  const scenario = pickScenario(matched.scenarios, request);

  const statusCode = scenario?.statusCode ?? matched.statusCode;
  const responseBody = scenario?.responseBody ?? matched.responseBody;
  const responseHeaders = scenario?.responseHeaders ?? matched.responseHeaders;
  const delayMin = scenario?.delayMs ?? matched.delayMs;
  const delayMax = scenario?.delayMaxMs ?? matched.delayMaxMs;

  const finalDelay = pickDelay(delayMin, delayMax);
  if (finalDelay > 0) {
    await wait(finalDelay);
  }

  const elapsed = Date.now() - now;

  // project globals first; endpoint/scenario headers win on collision.
  const globalHeaders = blueprint.settings.global_headers ?? {};
  const headers: Record<string, string> = { ...globalHeaders, ...(responseHeaders ?? {}) };

  if (blueprint.settings.cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    headers['Access-Control-Allow-Headers'] = '*';
  }

  headers['X-MockFlow-Project'] = projectSlug;
  headers['X-MockFlow-Endpoint'] = `${matched.method} ${matched.path}`;
  headers['X-MockFlow-Delay'] = `${finalDelay}ms`;
  headers['X-MockFlow-Elapsed'] = `${elapsed}ms`;
  headers['X-MockFlow-Cache'] = cacheStatus;
  if (scenario) {
    headers['X-MockFlow-Scenario'] = scenario.name;
  }

  const body = evaluateBody(responseBody, pathParams);

  if (blueprint.settings.log_requests) {
    RequestLog.create({
      projectId,
      endpointId: matched.id,
      method,
      path: incomingPath,
      statusCode,
      duration: elapsed,
    }).catch(() => {});
  }

  return { statusCode, body: body ?? {}, headers };
}
