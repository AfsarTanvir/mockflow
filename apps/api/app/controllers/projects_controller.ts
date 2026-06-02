import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import Project from '../models/project.js';
import TeamMember from '../models/team_member.js';
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
    const userId = auth.user!.id;

    // Projects via team_members (covers invitees + owners added after project creation)
    const memberships = await TeamMember.query()
      .where('user_id', userId)
      .preload('project')
      .orderBy('created_at', 'desc');

    const seenIds = new Set(memberships.map((m) => m.projectId));

    // Fallback: owned projects with no team_member row (created before team feature shipped)
    let legacyOwned: Project[] = [];
    if (seenIds.size > 0) {
      legacyOwned = await Project.query()
        .where('owner_id', userId)
        .whereNotIn('id', [...seenIds])
        .orderBy('created_at', 'desc');
    } else {
      legacyOwned = await Project.query().where('owner_id', userId).orderBy('created_at', 'desc');
    }

    return response.ok([
      ...memberships.map((m) => ({ ...m.project.serialize(), userRole: m.role })),
      ...legacyOwned.map((p) => ({ ...p.serialize(), userRole: 'owner' })),
    ]);
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
      settings: data.settings ?? { cors: true, log_requests: false, global_headers: {} },
    });

    // Add creator as owner in team_members
    await TeamMember.create({
      projectId: project.id,
      userId: auth.user!.id,
      role: 'owner',
      invitedAt: DateTime.now(),
    });

    return response.created(project);
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/projects/:id
  | Any team member (viewer+) can fetch project details.
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const project = await Project.find(params.id);
    if (!project) return response.notFound({ message: 'Project not found' });

    const userId = auth.user!.id;
    let userRole: string;

    if (project.ownerId === userId) {
      userRole = 'owner';
    } else {
      const tm = await TeamMember.query()
        .where('project_id', project.id)
        .where('user_id', userId)
        .first();
      if (!tm) return response.forbidden({ message: 'Access denied' });
      userRole = tm.role;
    }

    return response.ok({ ...project.serialize(), userRole });
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/projects/:id
  | Admin and owner can update project settings.
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const project = await Project.find(params.id);
    if (!project) return response.notFound({ message: 'Project not found' });

    const userId = auth.user!.id;
    const ROLE_RANK: Record<string, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };
    let role = 'viewer';

    if (project.ownerId === userId) {
      role = 'owner';
    } else {
      const tm = await TeamMember.query()
        .where('project_id', project.id)
        .where('user_id', userId)
        .first();
      if (!tm) return response.forbidden({ message: 'Access denied' });
      role = tm.role;
    }

    if (ROLE_RANK[role] < ROLE_RANK['admin']) {
      return response.forbidden({ message: 'Only admins and owners can update project settings' });
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
  | Owner only.
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const project = await Project.find(params.id);
    if (!project) return response.notFound({ message: 'Project not found' });

    if (project.ownerId !== auth.user!.id) {
      return response.forbidden({ message: 'Only the owner can delete this project' });
    }

    await project.delete();

    return response.ok({ message: 'Project deleted' });
  }
}
