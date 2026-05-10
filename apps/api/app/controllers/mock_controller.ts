import type { HttpContext } from '@adonisjs/core/http';
import { match } from 'path-to-regexp';
import Project from '../models/project.js';
import Endpoint from '../models/endpoint.js';
import RequestLog from '../models/request_log.js';
import { evaluateBody } from '../services/faker_evaluator.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class MockController {
  /*
  |--------------------------------------------------------------------------
  | Execute - ANY /mock/:projectSlug/*
  |--------------------------------------------------------------------------
  */
  async execute({ request, response, params }: HttpContext) {
    const start = Date.now()
    const projectSlug = params.projectSlug as string
    const wildcard = params['*']
    const incomingPath = '/' + (Array.isArray(wildcard) ? wildcard.join('/') : (wildcard ?? ''))
    const incomingMethod = request.method().toUpperCase()

    const project = await Project.findBy('slug', projectSlug)
    if (!project) {
      return response.notFound({ message: `No project with slug "${projectSlug}"` })
    }

    const endpoints = await Endpoint.query()
      .where('project_id', project.id)
      .where('is_active', true)
      .where('method', incomingMethod)

    let matched: Endpoint | null = null
    let pathParams: Record<string, string> = {}

    for (const endpoint of endpoints) {
      const fn = match(endpoint.path, { decode: decodeURIComponent })
      const result = fn(incomingPath)
      if (result) {
        matched = endpoint
        pathParams = result.params as Record<string, string>
        break
      }
    }

    if (!matched) {
      return response.notFound({
        message: `No active ${incomingMethod} endpoint matching "${incomingPath}"`,
      })
    }

    if (matched.delayMs > 0) {
      await delay(matched.delayMs)
    }

    const elapsed = Date.now() - start

    // Apply custom response headers
    for (const [key, value] of Object.entries(matched.responseHeaders ?? {})) {
      response.header(key, value)
    }

    if (project.settings.cors) {
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      response.header('Access-Control-Allow-Headers', '*')
    }

    // MockFlow diagnostic headers
    response.header('X-MockFlow-Project', project.slug)
    response.header('X-MockFlow-Endpoint', `${matched.method} ${matched.path}`)
    response.header('X-MockFlow-Delay', `${matched.delayMs}ms`)
    response.header('X-MockFlow-Elapsed', `${elapsed}ms`)

    const body = evaluateBody(matched.responseBody, pathParams)

    if (project.settings.log_requests) {
      RequestLog.create({
        projectId: project.id,
        endpointId: matched.id,
        method: incomingMethod,
        path: incomingPath,
        statusCode: matched.statusCode,
        duration: elapsed,
      }).catch(() => {})
    }

    return response.status(matched.statusCode).json(body ?? {})
  }
}
