/**
 * Pure permission helpers.
 *
 * These functions take **already-loaded** model-like shapes and return a
 * boolean. No DB lookups happen inside — the caller is responsible for
 * pre-loading the requester's profile, team membership, etc.
 *
 * Designed to mirror exactly the algorithm in
 * `docs/COMPANY-WORKSPACE-MODEL.md` (Permission resolution section).
 */

export type ProjectAction = 'read' | 'write' | 'delete';

export interface ProfileLike {
  id: string;
  companyId: string;
  status: 'active' | 'suspended' | 'inactive';
  role: 'owner' | 'admin' | 'member' | 'viewer';
  visibility: 'public' | 'company_member_only';
}

export interface ProjectLike {
  companyId: string;
  /** null = company-scoped; non-null = team-scoped */
  teamId: string | null;
}

export interface TeamLike {
  id: string;
  companyId: string;
  visibility: 'private' | 'company_member_only' | 'public';
}

export interface CompanyLike {
  id: string;
  visibility: 'private' | 'protected' | 'public';
}

export interface TeamMembershipLike {
  profileId: string;
  teamId: string;
  role: 'admin' | 'member';
}

/* ------------------------------------------------------------------ */
/* canActOnProject                                                     */
/* ------------------------------------------------------------------ */

/**
 * Can `profile` perform `action` on `project`?
 *
 * Resolution order:
 *   1. Profile must belong to the project's company AND be active
 *   2. owner / admin bypass everything below
 *   3. viewer is read-only
 *   4. member with team-scoped project: must have team_membership;
 *      delete requires team admin
 *   5. member with company-scoped project: read + write yes, delete no
 *
 * For team-scoped projects, pass the *requester's* team_membership for
 * that team (null if they have none).
 */
export function canActOnProject(
  profile: ProfileLike,
  project: ProjectLike,
  teamMembership: TeamMembershipLike | null,
  action: ProjectAction
): boolean {
  if (profile.companyId !== project.companyId) return false;
  if (profile.status !== 'active') return false;

  if (profile.role === 'owner' || profile.role === 'admin') return true;
  if (profile.role === 'viewer') return action === 'read';

  // From here: profile.role === 'member'

  if (project.teamId !== null) {
    if (!teamMembership) return false;
    if (teamMembership.profileId !== profile.id) return false;
    if (teamMembership.teamId !== project.teamId) return false;
    if (action === 'delete') return teamMembership.role === 'admin';
    return true;
  }

  // Company-scoped project: read + write for any active member
  if (action === 'delete') return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* canSeeTeam                                                          */
/* ------------------------------------------------------------------ */

/**
 * Can `viewer` (or an anonymous visitor when null) see this team's existence?
 *
 *   - Team members (any role) always see their team
 *   - Active company profiles see teams that aren't private
 *   - Anonymous + outside-company viewers: only if BOTH company AND team are public
 */
export function canSeeTeam(
  viewer: ProfileLike | null,
  team: TeamLike,
  company: CompanyLike,
  viewerTeamMembership: TeamMembershipLike | null
): boolean {
  if (viewer && viewerTeamMembership) return true;

  if (viewer && viewer.companyId === company.id && viewer.status === 'active') {
    return team.visibility !== 'private';
  }

  return company.visibility === 'public' && team.visibility === 'public';
}

/* ------------------------------------------------------------------ */
/* canSeeProfile                                                       */
/* ------------------------------------------------------------------ */

/**
 * Can `viewer` see the profile card of `target`?
 *   - public profiles are visible to anyone, regardless of company visibility
 *   - company_member_only profiles require the viewer to be an active member
 *     of the same company
 */
export function canSeeProfile(viewer: ProfileLike | null, target: ProfileLike): boolean {
  if (target.visibility === 'public') return true;
  if (!viewer) return false;
  return viewer.companyId === target.companyId && viewer.status === 'active';
}
