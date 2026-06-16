import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import Endpoint from '#models/endpoint';
import * as AccessService from '#services/access_service';
import * as cache from '#services/cache_service';
import * as EndpointQueries from '#queries/endpoint_queries';
import { validateEndpointDelayRange } from '#validators/endpoint_validator';
import type {
  createEndpointValidator,
  updateEndpointValidator,
} from '#validators/endpoint_validator';

export type CreateEndpointInput = Infer<typeof createEndpointValidator>;
export type UpdateEndpointInput = Infer<typeof updateEndpointValidator>;

/** List a project's endpoints. Any team member (viewer+). */
export async function listForProject(projectId: string, userId: string) {
  await AccessService.assertProjectAccess(projectId, userId, 'viewer');
  return EndpointQueries.listForProject(projectId);
}

/** Create an endpoint. Member+. Rejects delay-range and (method, path) conflicts. */
export async function createEndpoint(
  projectId: string,
  userId: string,
  input: CreateEndpointInput
): Promise<Endpoint> {
  await AccessService.assertProjectAccess(projectId, userId, 'member');

  const delayError = validateEndpointDelayRange(input.delayMs, input.delayMaxMs);
  if (delayError) {
    throw new Exception(delayError, { status: 422, code: 'E_DELAY_RANGE' });
  }

  const conflict = await EndpointQueries.findConflict(projectId, input.method, input.path);
  if (conflict) {
    throw new Exception(`${input.method} ${input.path} already exists`, {
      status: 409,
      code: 'E_CONFLICT',
    });
  }

  const endpoint = await Endpoint.create({
    projectId,
    method: input.method,
    path: input.path,
    statusCode: input.statusCode ?? 200,
    responseBody: input.responseBody ?? null,
    responseHeaders: input.responseHeaders ?? {},
    delayMs: input.delayMs ?? 0,
    delayMaxMs: input.delayMaxMs ?? null,
    isActive: input.isActive ?? true,
    createdBy: userId,
  });
  await cache.invalidateMock(projectId);
  return endpoint;
}

/** A single endpoint. Any team member (viewer+). */
export async function getEndpoint(endpointId: string, userId: string): Promise<Endpoint> {
  const { endpoint } = await AccessService.assertEndpointAccess(endpointId, userId, 'viewer');
  return endpoint;
}

/** Update an endpoint. Member+. Re-checks delay range and (method, path) conflicts. */
export async function updateEndpoint(
  endpointId: string,
  userId: string,
  input: UpdateEndpointInput
): Promise<Endpoint> {
  const { endpoint } = await AccessService.assertEndpointAccess(endpointId, userId, 'member');

  const finalDelayMs = input.delayMs !== undefined ? input.delayMs : endpoint.delayMs;
  const finalDelayMaxMs = input.delayMaxMs !== undefined ? input.delayMaxMs : endpoint.delayMaxMs;
  const delayError = validateEndpointDelayRange(finalDelayMs, finalDelayMaxMs);
  if (delayError) {
    throw new Exception(delayError, { status: 422, code: 'E_DELAY_RANGE' });
  }

  const newMethod = input.method ?? endpoint.method;
  const newPath = input.path ?? endpoint.path;
  if (
    (input.method !== undefined || input.path !== undefined) &&
    (newMethod !== endpoint.method || newPath !== endpoint.path)
  ) {
    const conflict = await EndpointQueries.findConflict(
      endpoint.projectId,
      newMethod,
      newPath,
      endpoint.id
    );
    if (conflict) {
      throw new Exception(`${newMethod} ${newPath} already exists`, {
        status: 409,
        code: 'E_CONFLICT',
      });
    }
  }

  endpoint.merge({
    ...(input.method !== undefined && { method: input.method }),
    ...(input.path !== undefined && { path: input.path }),
    ...(input.statusCode !== undefined && { statusCode: input.statusCode }),
    ...(input.responseBody !== undefined && { responseBody: input.responseBody }),
    ...(input.responseHeaders !== undefined && { responseHeaders: input.responseHeaders }),
    ...(input.delayMs !== undefined && { delayMs: input.delayMs }),
    ...(input.delayMaxMs !== undefined && { delayMaxMs: input.delayMaxMs }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });
  await endpoint.save();
  await cache.invalidateMock(endpoint.projectId);

  return endpoint;
}

/** Delete an endpoint. Member+. */
export async function deleteEndpoint(endpointId: string, userId: string): Promise<void> {
  const { endpoint } = await AccessService.assertEndpointAccess(endpointId, userId, 'member');
  await endpoint.delete();
  await cache.invalidateMock(endpoint.projectId);
}

/** Flip an endpoint's active flag. Member+. */
export async function toggleEndpoint(endpointId: string, userId: string): Promise<Endpoint> {
  const { endpoint } = await AccessService.assertEndpointAccess(endpointId, userId, 'member');
  endpoint.isActive = !endpoint.isActive;
  await endpoint.save();
  await cache.invalidateMock(endpoint.projectId);
  return endpoint;
}
