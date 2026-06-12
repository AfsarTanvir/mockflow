import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import Project from '#models/project';
import TeamMember from '#models/team_member';
import TeamMetadata from '#models/team_metadata';
import { slugify } from '#services/slug_helper';
import * as AccessService from '#services/access_service';
import * as ProjectQueries from '#queries/project_queries';
import * as TeamMemberQueries from '#queries/team_member_queries';
import * as TeamQueries from '#queries/team_queries';
import * as ProfileQueries from '#queries/profile_queries';
import * as TeamMembershipQueries from '#queries/team_membership_queries';
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
  // Personal projects only — team-owned projects show under their team.
  const personal = memberships.filter((m) => m.project.teamId === null);
  const seenIds = personal.map((m) => m.projectId);
  const legacyOwned = await ProjectQueries.listOwnedByUser(userId, seenIds);

  return [
    ...personal.map((m) => ({ ...m.project.serialize(), userRole: m.role })),
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

/**
 * Can this user manage a team's projects (create/delete)? True for company
 * owner/admin or a team admin. Returns the team's companyId for convenience.
 */
async function resolveTeamManage(
  userId: string,
  teamId: string
): Promise<{ companyId: string } | null> {
  const team = await TeamQueries.findById(teamId);
  if (!team) throw new Exception('Team not found', { status: 404, code: 'E_TEAM_NOT_FOUND' });
  const profile = await ProfileQueries.findActiveByUserAndCompany(userId, team.companyId);
  if (!profile) return null;
  if (profile.role === 'owner' || profile.role === 'admin') return { companyId: team.companyId };
  const membership = await TeamMembershipQueries.findForProfileTeam(profile.id, teamId);
  return membership?.role === 'admin' ? { companyId: team.companyId } : null;
}

/** List a team's projects. Visible to company owner/admin or members of the team. */
export async function listTeamProjects(userId: string, teamId: string) {
  const team = await TeamQueries.findById(teamId);
  if (!team) throw new Exception('Team not found', { status: 404, code: 'E_TEAM_NOT_FOUND' });
  const profile = await ProfileQueries.findActiveByUserAndCompany(userId, team.companyId);
  if (!profile) throw new Exception('Access denied', { status: 403, code: 'E_FORBIDDEN' });
  const isCompanyAdmin = profile.role === 'owner' || profile.role === 'admin';
  if (!isCompanyAdmin) {
    const membership = await TeamMembershipQueries.findForProfileTeam(profile.id, teamId);
    if (!membership) throw new Exception('Access denied', { status: 403, code: 'E_FORBIDDEN' });
  }
  const projects = await ProjectQueries.listForTeam(teamId);
  return projects.map((p) => p.serialize());
}

/** Company-wide project portfolio across all teams. Owner/admin only. */
export async function listCompanyProjects(userId: string, companyId: string) {
  const profile = await ProfileQueries.findActiveByUserAndCompany(userId, companyId);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    throw new Exception('Only company owner/admin can view all company projects', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }
  const projects = await ProjectQueries.listForCompany(companyId);
  // Expose only a thin {id,name,slug} for the owning team — not the full Team row.
  return projects.map((p) => ({
    ...p.serialize(),
    team: p.team ? { id: p.team.id, name: p.team.name, slug: p.team.slug } : null,
  }));
}

/** Create a project owned by a team (company owner/admin or team admin only). */
export async function createTeamProject(
  userId: string,
  teamId: string,
  input: CreateProjectInput
): Promise<Project> {
  const manage = await resolveTeamManage(userId, teamId);
  if (!manage) {
    throw new Exception('Only company owner/admin or a team admin can create team projects', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }

  return db.transaction(async (trx) => {
    const project = await Project.create(
      {
        name: input.name,
        slug: slugify(input.name),
        basePath: input.basePath ?? '/',
        ownerId: userId,
        teamId,
        isPublic: input.isPublic ?? false,
        settings: input.settings ?? DEFAULT_SETTINGS,
      },
      { client: trx }
    );

    await TeamMember.create(
      { projectId: project.id, userId, role: 'owner', invitedAt: DateTime.now() },
      { client: trx }
    );

    await TeamMetadata.query({ client: trx })
      .where('team_id', teamId)
      .increment('total_project', 1);

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

  // Personal: owner only. Team: owner OR team admin / company owner-admin.
  let allowed = project.ownerId === userId;
  if (!allowed && project.teamId) {
    allowed = (await resolveTeamManage(userId, project.teamId)) !== null;
  }
  if (!allowed) {
    throw new Exception('You do not have permission to delete this project', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }

  const { teamId } = project;
  await project.delete();
  if (teamId) {
    await TeamMetadata.query().where('team_id', teamId).decrement('total_project', 1);
  }
}
