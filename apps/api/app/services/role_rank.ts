/**
 * Canonical privilege ordering shared by the project, company, team and profile
 * role unions — they all use these four names. Single source of truth: this map
 * was previously copy-pasted across access_service, profile_service,
 * team_membership_service, companies_controller and teams_controller.
 */
export type RoleName = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLE_RANK: Record<RoleName, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** Does `role` meet or exceed the `min` required role? */
export function hasRank(role: RoleName, min: RoleName): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
