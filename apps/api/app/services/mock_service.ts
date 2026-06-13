import { match } from 'path-to-regexp';
import { Exception } from '@adonisjs/core/exceptions';
import type { HttpContext } from '@adonisjs/core/http';
import Endpoint from '#models/endpoint';
import RequestLog from '#models/request_log';
import * as ProjectQueries from '#queries/project_queries';
import * as EndpointQueries from '#queries/endpoint_queries';
import * as AccessService from '#services/access_service';
import { evaluateBody } from '#services/faker_evaluator';
import { resolveScenario } from '#services/scenario_resolver';

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

/**
 * Resolve a mock request to a concrete response: match an active endpoint by
 * method + path, apply the winning scenario's overrides, merge headers
 * (project globals → endpoint/scenario → CORS → diagnostics), evaluate the
 * faker body, and (optionally) log the request. Throws 404 when nothing matches.
 *
 * `now` is the request-start timestamp (ms) supplied by the controller so the
 * X-MockFlow-Elapsed header can be computed.
 */
export async function resolveMock(
  projectSlug: string,
  method: string,
  incomingPath: string,
  request: HttpContext['request'],
  now: number,
  userId?: string
): Promise<MockResponse> {
  const project = await ProjectQueries.findBySlug(projectSlug);
  if (!project) {
    throw new Exception(`No project with slug "${projectSlug}"`, {
      status: 404,
      code: 'E_PROJECT_NOT_FOUND',
    });
  }

  // Private projects are only servable to members. Return 404 (not 403) for
  // everyone else so the project's existence isn't revealed by the slug.
  if (!project.isPublic) {
    const role = userId ? await AccessService.resolveProjectRole(project, userId) : null;
    if (!role) {
      throw new Exception(`No project with slug "${projectSlug}"`, {
        status: 404,
        code: 'E_PROJECT_NOT_FOUND',
      });
    }
  }

  const endpoints = await EndpointQueries.listActiveByMethod(project.id, method);

  let matched: Endpoint | null = null;
  let pathParams: Record<string, string> = {};
  for (const endpoint of endpoints) {
    const fn = match(endpoint.path, { decode: decodeURIComponent });
    const result = fn(incomingPath);
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

  // Rule-based scenario first, then a manually activated one, else endpoint defaults.
  const scenario = await resolveScenario(matched.id, request);

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
  const globalHeaders = project.settings.global_headers ?? {};
  const headers: Record<string, string> = { ...globalHeaders, ...(responseHeaders ?? {}) };

  if (project.settings.cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    headers['Access-Control-Allow-Headers'] = '*';
  }

  headers['X-MockFlow-Project'] = project.slug;
  headers['X-MockFlow-Endpoint'] = `${matched.method} ${matched.path}`;
  headers['X-MockFlow-Delay'] = `${finalDelay}ms`;
  headers['X-MockFlow-Elapsed'] = `${elapsed}ms`;
  if (scenario) {
    headers['X-MockFlow-Scenario'] = scenario.name;
  }

  const body = evaluateBody(responseBody, pathParams);

  if (project.settings.log_requests) {
    RequestLog.create({
      projectId: project.id,
      endpointId: matched.id,
      method,
      path: incomingPath,
      statusCode,
      duration: elapsed,
    }).catch(() => {});
  }

  return { statusCode, body: body ?? {}, headers };
}
