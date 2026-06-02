import type { HttpContext } from '@adonisjs/core/http';
import env from '#start/env';
import Project from '../models/project.js';
import Endpoint from '../models/endpoint.js';
import TeamMember from '../models/team_member.js';
import { buildOpenApiDoc } from '../services/openapi_exporter.js';
import { buildPostmanCollection } from '../services/postman_exporter.js';

async function resolveRole(project: Project, userId: string): Promise<string | null> {
  if (project.ownerId === userId) return 'owner';
  const tm = await TeamMember.query()
    .where('project_id', project.id)
    .where('user_id', userId)
    .first();
  return tm?.role ?? null;
}

export default class ExportController {
  /*
  |--------------------------------------------------------------------------
  | OpenAPI 3.0 Export
  | GET /api/projects/:id/export/openapi?evaluate=false
  |--------------------------------------------------------------------------
  */
  async openapi({ auth, params, request, response }: HttpContext) {
    const project = await Project.find(params.id);
    if (!project) return response.notFound({ message: 'Project not found' });

    const role = await resolveRole(project, auth.user!.id);
    if (!role) return response.forbidden({ message: 'Access denied' });

    const evaluate = request.input('evaluate', 'false') === 'true';

    const endpoints = await Endpoint.query()
      .where('project_id', project.id)
      .orderBy('created_at', 'asc');

    const apiUrl = env.get('API_URL', 'http://localhost:3333');
    const doc = buildOpenApiDoc(project, endpoints, apiUrl, evaluate);

    response.header('Content-Type', 'application/json');
    response.header('Content-Disposition', `attachment; filename="${project.slug}-openapi.json"`);
    return response.ok(doc);
  }

  /*
  |--------------------------------------------------------------------------
  | Postman Collection v2.1 Export
  | GET /api/projects/:id/export/postman?evaluate=false
  |--------------------------------------------------------------------------
  */
  async postman({ auth, params, request, response }: HttpContext) {
    const project = await Project.find(params.id);
    if (!project) return response.notFound({ message: 'Project not found' });

    const role = await resolveRole(project, auth.user!.id);
    if (!role) return response.forbidden({ message: 'Access denied' });

    const evaluate = request.input('evaluate', 'false') === 'true';

    const endpoints = await Endpoint.query()
      .where('project_id', project.id)
      .orderBy('created_at', 'asc');

    const apiUrl = env.get('API_URL', 'http://localhost:3333');
    const collection = buildPostmanCollection(project, endpoints, apiUrl, evaluate);

    response.header('Content-Type', 'application/json');
    response.header('Content-Disposition', `attachment; filename="${project.slug}-postman.json"`);
    return response.ok(collection);
  }
}
