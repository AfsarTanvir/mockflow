import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import Project from '#models/project';
import TeamMember from '#models/team_member';
import { slugify } from '#services/slug_helper';
import * as AccessService from '#services/access_service';
import * as ProjectQueries from '#queries/project_queries';
import * as TeamMemberQueries from '#queries/team_member_queries';
import type { createProjectValidator, updateProjectValidator } from '#validators/project_validator';

export type CreateProjectInput = Infer<typeof createProjectValidator>;
export type UpdateProjectInput = Infer<typeof updateProjectValidator>;

const DEFAULT_SETTINGS = { cors: true, log_requests: false, global_headers: {} };

/**
 * All projects the user can see, newest first: every project they're a member
 * of (with their role) plus a fallback for projects they own that predate the
 * team_members feature (surfaced with role 'owner'). Preserves the original
 * controller's dedup semantics.
 */
export async function listForUser(userId: string) {
  const memberships = await TeamMemberQueries.listForUser(userId);
  const seenIds = memberships.map((m) => m.projectId);
  const legacyOwned = await ProjectQueries.listOwnedByUser(userId, seenIds);

  return [
    ...memberships.map((m) => ({ ...m.project.serialize(), userRole: m.role })),
    ...legacyOwned.map((p) => ({ ...p.serialize(), userRole: 'owner' as const })),
  ];
}

/**
 * Create a project and register the creator as its owner in team_members,
 * atomically.
 */
export async function createProject(userId: string, input: CreateProjectInput): Promise<Project> {
  return db.transaction(async (trx) => {
    const project = await Project.create(
      {
        name: input.name,
        slug: slugify(input.name),
        basePath: input.basePath ?? '/',
        ownerId: userId,
        isPublic: input.isPublic ?? false,
        settings: input.settings ?? DEFAULT_SETTINGS,
      },
      { client: trx }
    );

    await TeamMember.create(
      {
        projectId: project.id,
        userId,
        role: 'owner',
        invitedAt: DateTime.now(),
      },
      { client: trx }
    );

    return project;
  });
}

/** A single project plus the requester's role. Any team member (viewer+) may read. */
export async function getForUser(projectId: string, userId: string) {
  const { project, role } = await AccessService.assertProjectAccess(projectId, userId, 'viewer');
  return { ...project.serialize(), userRole: role };
}

/** Update core project fields. Admin or owner only. */
export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const { project } = await AccessService.assertProjectAccess(projectId, userId, 'admin');

  project.merge({
    ...(input.name !== undefined && { name: input.name }),
    ...(input.basePath !== undefined && { basePath: input.basePath }),
    ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
    ...(input.settings !== undefined && { settings: input.settings }),
  });
  await project.save();

  return project;
}

/** Delete a project. Owner only. */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await ProjectQueries.findById(projectId);
  if (!project) {
    throw new Exception('Project not found', { status: 404, code: 'E_PROJECT_NOT_FOUND' });
  }
  if (project.ownerId !== userId) {
    throw new Exception('Only the owner can delete this project', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }
  await project.delete();
}
