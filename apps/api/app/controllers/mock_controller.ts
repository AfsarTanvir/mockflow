import type { HttpContext } from '@adonisjs/core/http';
import { match } from 'path-to-regexp';
import Project from '../models/project.js';
import Endpoint from '../models/endpoint.js';
import RequestLog from '../models/request_log.js';
import { evaluateBody } from '../services/faker_evaluator.js';
import { resolveScenario } from '../services/scenario_resolver.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickDelay(min: number, max: number | null): number {
  if (max == null || max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default class MockController {
  /*
  |--------------------------------------------------------------------------
  | Execute - ANY /mock/:projectSlug/*
  |--------------------------------------------------------------------------
  */
  async execute({ request, response, params }: HttpContext) {
    const start = Date.now();
    const projectSlug = params.projectSlug as string;
    const wildcard = params['*'];
    const incomingPath = '/' + (Array.isArray(wildcard) ? wildcard.join('/') : (wildcard ?? ''));
    const incomingMethod = request.method().toUpperCase();

    const project = await Project.findBy('slug', projectSlug);
    if (!project) {
      return response.notFound({ message: `No project with slug "${projectSlug}"` });
    }

    const endpoints = await Endpoint.query()
      .where('project_id', project.id)
      .where('is_active', true)
      .where('method', incomingMethod);

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
      return response.notFound({
        message: `No active ${incomingMethod} endpoint matching "${incomingPath}"`,
      });
    }

    // Resolve scenario — rule-based first, then manually activated fallback
    const scenario = await resolveScenario(matched.id, request);

    // Merge fields — scenario overrides endpoint defaults when set
    const statusCode = scenario?.statusCode ?? matched.statusCode;
    const responseBody = scenario?.responseBody ?? matched.responseBody;
    const responseHeaders = scenario?.responseHeaders ?? matched.responseHeaders;
    const delayMin = scenario?.delayMs ?? matched.delayMs;
    const delayMax = scenario?.delayMaxMs ?? matched.delayMaxMs;

    const finalDelay = pickDelay(delayMin, delayMax);
    if (finalDelay > 0) await delay(finalDelay);

    const elapsed = Date.now() - start;

    // Merge headers: project global first, endpoint/scenario overrides win on key collision
    const globalHeaders = project.settings.global_headers ?? {};
    const mergedHeaders = { ...globalHeaders, ...(responseHeaders ?? {}) };
    for (const [key, value] of Object.entries(mergedHeaders)) {
      response.header(key, value);
    }

    if (project.settings.cors) {
      response.header('Access-Control-Allow-Origin', '*');
      response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.header('Access-Control-Allow-Headers', '*');
    }

    // MockFlow diagnostic headers
    response.header('X-MockFlow-Project', project.slug);
    response.header('X-MockFlow-Endpoint', `${matched.method} ${matched.path}`);
    response.header('X-MockFlow-Delay', `${finalDelay}ms`);
    response.header('X-MockFlow-Elapsed', `${elapsed}ms`);
    if (scenario) {
      response.header('X-MockFlow-Scenario', scenario.name);
    }

    const body = evaluateBody(responseBody, pathParams);

    if (project.settings.log_requests) {
      RequestLog.create({
        projectId: project.id,
        endpointId: matched.id,
        method: incomingMethod,
        path: incomingPath,
        statusCode,
        duration: elapsed,
      }).catch(() => {});
    }

    return response.status(statusCode).json(body ?? {});
  }
}
