import { Exception } from '@adonisjs/core/exceptions';
import * as ProjectQueries from '#queries/project_queries';
import * as TeamMemberQueries from '#queries/team_member_queries';
import * as TeamQueries from '#queries/team_queries';
import * as ProfileQueries from '#queries/profile_queries';
import * as TeamMembershipQueries from '#queries/team_membership_queries';
import * as EndpointQueries from '#queries/endpoint_queries';
import * as ScenarioQueries from '#queries/scenario_queries';
import * as RuleQueries from '#queries/rule_queries';
import { ROLE_RANK, hasRank } from '#services/role_rank';
import type Project from '#models/project';
import type Endpoint from '#models/endpoint';
import type EndpointScenario from '#models/endpoint_scenario';
import type ScenarioRule from '#models/scenario_rule';
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

// Canonical rank map + helper now live in #services/role_rank; re-export so
// existing `import { ROLE_RANK, hasRank } from '#services/access_service'` works.
export { ROLE_RANK, hasRank };

/** The higher of two roles (null = no role yet). */
function maxRole(a: ProjectRole | null, b: ProjectRole): ProjectRole {
  if (!a) return b;
  return ROLE_RANK[a] >= ROLE_RANK[b] ? a : b;
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

  // Per-project collaborators (personal projects + explicit invites).
  const membership = await TeamMemberQueries.findForProjectUser(project.id, userId, client);
  let role: ProjectRole | null = membership ? membership.role : null;

  // Team-owned project: access flows from the workspace team + company role.
  if (project.teamId) {
    const team = await TeamQueries.findById(project.teamId, client);
    if (team) {
      const profile = await ProfileQueries.findActiveByUserAndCompany(
        userId,
        team.companyId,
        client
      );
      if (profile) {
        // Company owner/admin get manage-level oversight of every team project.
        if (profile.role === 'owner' || profile.role === 'admin') {
          role = maxRole(role, 'admin');
        }
        // Team membership: team admin → manage, team member → edit.
        const teamMembership = await TeamMembershipQueries.findForProfileTeam(
          profile.id,
          project.teamId,
          client
        );
        if (teamMembership) {
          role = maxRole(role, teamMembership.role === 'admin' ? 'admin' : 'member');
        }
      }
    }
  }

  return role;
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

/**
 * Access gate for an endpoint: load it, then check the parent project.
 * Throws 404 if the endpoint is missing.
 */
export async function assertEndpointAccess(
  endpointId: string,
  userId: string,
  minRole: ProjectRole,
  client?: TransactionClientContract
): Promise<{ endpoint: Endpoint; project: Project; role: ProjectRole }> {
  const endpoint = await EndpointQueries.findById(endpointId, client);
  if (!endpoint) {
    throw new Exception('Endpoint not found', { status: 404, code: 'E_ENDPOINT_NOT_FOUND' });
  }
  const { project, role } = await assertProjectAccess(endpoint.projectId, userId, minRole, client);
  return { endpoint, project, role };
}

/**
 * Access gate for a scenario: load it, then walk scenario → endpoint → project.
 * Throws 404 if the scenario is missing.
 */
export async function assertScenarioAccess(
  scenarioId: string,
  userId: string,
  minRole: ProjectRole,
  client?: TransactionClientContract
): Promise<{
  scenario: EndpointScenario;
  endpoint: Endpoint;
  project: Project;
  role: ProjectRole;
}> {
  const scenario = await ScenarioQueries.findById(scenarioId, client);
  if (!scenario) {
    throw new Exception('Scenario not found', { status: 404, code: 'E_SCENARIO_NOT_FOUND' });
  }
  const { endpoint, project, role } = await assertEndpointAccess(
    scenario.endpointId,
    userId,
    minRole,
    client
  );
  return { scenario, endpoint, project, role };
}

/**
 * Access gate for a rule: load it, then walk rule → scenario → endpoint → project.
 * Throws 404 if the rule is missing.
 */
export async function assertRuleAccess(
  ruleId: string,
  userId: string,
  minRole: ProjectRole,
  client?: TransactionClientContract
): Promise<{
  rule: ScenarioRule;
  scenario: EndpointScenario;
  endpoint: Endpoint;
  project: Project;
  role: ProjectRole;
}> {
  const rule = await RuleQueries.findById(ruleId, client);
  if (!rule) {
    throw new Exception('Rule not found', { status: 404, code: 'E_RULE_NOT_FOUND' });
  }
  const access = await assertScenarioAccess(rule.scenarioId, userId, minRole, client);
  return { rule, ...access };
}
