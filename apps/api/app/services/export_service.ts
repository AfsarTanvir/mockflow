import env from '#start/env';
import * as AccessService from '#services/access_service';
import * as EndpointQueries from '#queries/endpoint_queries';
import { buildOpenApiDoc } from '#services/openapi_exporter';
import { buildPostmanCollection } from '#services/postman_exporter';

/** Load the project + its endpoints for export, gated to any team member (viewer+). */
async function loadForExport(projectId: string, userId: string) {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'viewer');
  const endpoints = await EndpointQueries.listForProject(project.id);
  const apiUrl = env.get('API_URL', 'http://localhost:3333');
  return { project, endpoints, apiUrl };
}

export async function buildOpenApi(projectId: string, userId: string, evaluate: boolean) {
  const { project, endpoints, apiUrl } = await loadForExport(projectId, userId);
  return {
    doc: buildOpenApiDoc(project, endpoints, apiUrl, evaluate),
    filename: `${project.slug}-openapi.json`,
  };
}

export async function buildPostman(projectId: string, userId: string, evaluate: boolean) {
  const { project, endpoints, apiUrl } = await loadForExport(projectId, userId);
  return {
    collection: buildPostmanCollection(project, endpoints, apiUrl, evaluate),
    filename: `${project.slug}-postman.json`,
  };
}
