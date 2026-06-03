import { Exception } from '@adonisjs/core/exceptions';
import * as ProjectQueries from '#queries/project_queries';
import * as TeamMemberQueries from '#queries/team_member_queries';
import type Project from '#models/project';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/**
 * Single source of truth for **legacy project authorization**
 * (the `projects` + `team_members` world, keyed by `project.ownerId`).
 *
 * This replaces the `ROLE_RANK` constant and the `resolveProjectAccess` /
 * `resolveAccess` / `resolveScenarioAccess` helpers that were copy-pasted
 * across the projects / endpoints / scenarios / rules / version / import
 * controllers.
 *
 * NOTE: this is distinct from `permission_resolver.ts`, which is the pure
 * decision layer for the newer Company / Profile / Team domain.
 */

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** Does `role` meet or exceed the `min` required role? */
export function hasRank(role: ProjectRole, min: ProjectRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export type AccessError = 'not_found' | 'forbidden';

export interface ProjectAccess {
  project: Project | null;
  role: ProjectRole | null;
  error: AccessError | null;
}

/**
 * Resolve a user's effective role on an already-loaded project.
 * Owner is derived from `project.ownerId`; everyone else from `team_members`.
 * Returns null if the user has no access at all.
 */
export async function resolveProjectRole(
  project: Project,
  userId: string,
  client?: TransactionClientContract
): Promise<ProjectRole | null> {
  if (project.ownerId === userId) {
    return 'owner';
  }
  const membership = await TeamMemberQueries.findForProjectUser(project.id, userId, client);
  return membership ? membership.role : null;
}

/**
 * Full access gate: load the project, resolve the user's role, and check it
 * against `minRole`. Controllers map the returned `error` to an HTTP status:
 *   - 'not_found' → 404
 *   - 'forbidden' → 403
 */
export async function resolveProjectAccess(
  projectId: string,
  userId: string,
  minRole: ProjectRole,
  client?: TransactionClientContract
): Promise<ProjectAccess> {
  const project = await ProjectQueries.findById(projectId, client);
  if (!project) {
    return { project: null, role: null, error: 'not_found' };
  }

  const role = await resolveProjectRole(project, userId, client);
  if (!role) {
    return { project, role: null, error: 'forbidden' };
  }
  if (!hasRank(role, minRole)) {
    return { project, role, error: 'forbidden' };
  }

  return { project, role, error: null };
}

/**
 * Like {@link resolveProjectAccess} but throws instead of returning an error
 * code — convenient for services that just want the project + role or a
 * thrown HTTP error. 'not_found' → 404, 'forbidden' → 403.
 */
export async function assertProjectAccess(
  projectId: string,
  userId: string,
  minRole: ProjectRole,
  client?: TransactionClientContract
): Promise<{ project: Project; role: ProjectRole }> {
  const access = await resolveProjectAccess(projectId, userId, minRole, client);
  if (access.error === 'not_found' || !access.project) {
    throw new Exception('Project not found', { status: 404, code: 'E_PROJECT_NOT_FOUND' });
  }
  if (access.error === 'forbidden' || !access.role) {
    throw new Exception('You do not have permission to perform this action', {
      status: 403,
      code: 'E_FORBIDDEN',
    });
  }
  return { project: access.project, role: access.role };
}
