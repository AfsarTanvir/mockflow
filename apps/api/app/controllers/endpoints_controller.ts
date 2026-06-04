import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as EndpointService from '#services/endpoint_service';
import { createEndpointValidator, updateEndpointValidator } from '#validators/endpoint_validator';

export default class EndpointsController {
  /** GET /api/projects/:projectId/endpoints */
  async index({ auth, params, response }: HttpContext) {
    try {
      const endpoints = await EndpointService.listForProject(params.projectId, auth.user!.id);
      return response.ok(endpoints);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/projects/:projectId/endpoints */
  async store({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(createEndpointValidator);
    try {
      const endpoint = await EndpointService.createEndpoint(params.projectId, auth.user!.id, data);
      return response.created(endpoint);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/endpoints/:id */
  async show({ auth, params, response }: HttpContext) {
    try {
      const endpoint = await EndpointService.getEndpoint(params.id, auth.user!.id);
      return response.ok(endpoint);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PUT /api/endpoints/:id */
  async update({ auth, params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateEndpointValidator);
    try {
      const endpoint = await EndpointService.updateEndpoint(params.id, auth.user!.id, data);
      return response.ok(endpoint);
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/endpoints/:id */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      await EndpointService.deleteEndpoint(params.id, auth.user!.id);
      return response.ok({ message: 'Endpoint deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PATCH /api/endpoints/:id/toggle */
  async toggle({ auth, params, response }: HttpContext) {
    try {
      const endpoint = await EndpointService.toggleEndpoint(params.id, auth.user!.id);
      return response.ok(endpoint);
    } catch (error) {
      return respondError(error, response);
    }
  }
}
