import type { HttpContext } from '@adonisjs/core/http';
import Project from '../models/project.js';
import { createProjectValidator, updateProjectValidator } from '../validators/project_validator.js';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export default class ProjectsController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/projects
  |--------------------------------------------------------------------------
  */
  async index({ auth, response }: HttpContext) {
    const projects = await Project.query()
      .where('owner_id', auth.user!.id)
      .orderBy('created_at', 'desc');

    return response.ok(projects);
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/projects
  |--------------------------------------------------------------------------
  */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createProjectValidator);

    const project = await Project.create({
      name: data.name,
      slug: slugify(data.name),
      basePath: data.basePath ?? '/',
      ownerId: auth.user!.id,
      isPublic: data.isPublic ?? false,
      settings: data.settings ?? { cors: true, log_requests: false },
    });

    return response.created(project);
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/projects/:id
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const project = await Project.find(params.id);

    if (!project) {
      return response.notFound({ message: 'Project not found' });
    }

    if (project.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Access denied' });
    }

    return response.ok(project);
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/projects/:id
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const project = await Project.find(params.id);

    if (!project) {
      return response.notFound({ message: 'Project not found' });
    }

    if (project.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Access denied' });
    }

    const data = await request.validateUsing(updateProjectValidator);

    project.merge({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.basePath !== undefined && { basePath: data.basePath }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.settings !== undefined && { settings: data.settings }),
    });

    await project.save();

    return response.ok(project);
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/projects/:id
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const project = await Project.find(params.id);

    if (!project) {
      return response.notFound({ message: 'Project not found' });
    }

    if (project.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Access denied' });
    }

    await project.delete();

    return response.ok({ message: 'Project deleted' });
  }
}
