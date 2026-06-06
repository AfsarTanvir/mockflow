import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import User from '#models/user';
import Profile from '#models/profile';
import type { ProfileRole } from '#models/profile';
import * as AdminQueries from '#queries/admin_queries';
import * as CompanyService from '#services/company_service';
import { cleanupForInactiveProfile } from '#services/team_membership_service';

/**
 * Platform-admin orchestration. Reads funnel to admin_queries; company
 * mutations reuse the actor-agnostic company_service; profile mutations use
 * admin-BYPASS variants (no per-company actor/rank checks) that still protect
 * the one-owner-per-company invariant. All callers are gated by `superAdmin`.
 */

/* ---- reads (unscoped, paginated) ---- */
export const listUsers = AdminQueries.listUsers;
export const listCompanies = AdminQueries.listCompanies;
export const listProfiles = AdminQueries.listProfiles;
export const listTeams = AdminQueries.listTeams;
export const listProjects = AdminQueries.listProjects;
export const listEndpoints = AdminQueries.listEndpoints;
export const listRequestLogs = AdminQueries.listRequestLogs;
export const getStats = AdminQueries.getPlatformStats;

/* ---- company management (reuse actor-agnostic service) ---- */
export function updateCompany(
  companyId: string,
  input: Parameters<typeof CompanyService.updateCompany>[1]
) {
  return CompanyService.updateCompany(companyId, input);
}
export function deleteCompany(companyId: string) {
  return CompanyService.deleteCompany(companyId);
}
export function transferOwnership(companyId: string, newOwnerProfileId: string) {
  return CompanyService.transferOwnership(companyId, newOwnerProfileId);
}

/* ---- profile management (admin bypass; owner invariant preserved) ---- */
async function loadProfile(id: string): Promise<Profile> {
  const profile = await Profile.find(id);
  if (!profile)
    throw new Exception('Profile not found', { status: 404, code: 'E_PROFILE_NOT_FOUND' });
  return profile;
}

export async function suspendProfile(id: string): Promise<Profile> {
  const profile = await loadProfile(id);
  if (profile.role === 'owner') {
    throw new Exception('Cannot suspend a company owner; transfer ownership first', {
      status: 422,
      code: 'E_OWNER_LOCKED',
    });
  }
  profile.status = 'suspended';
  await profile.save();
  return profile;
}

export async function reactivateProfile(id: string): Promise<Profile> {
  const profile = await loadProfile(id);
  profile.status = 'active';
  profile.leftAt = null;
  if (!profile.joinedAt) profile.joinedAt = DateTime.now();
  await profile.save();
  return profile;
}

export async function deactivateProfile(id: string): Promise<Profile> {
  const profile = await loadProfile(id);
  if (profile.role === 'owner') {
    throw new Exception('Cannot deactivate a company owner; transfer ownership first', {
      status: 422,
      code: 'E_OWNER_LOCKED',
    });
  }
  await db.transaction(async (trx) => {
    profile.useTransaction(trx);
    profile.status = 'inactive';
    profile.leftAt = DateTime.now();
    await profile.save();
    await cleanupForInactiveProfile(profile.id, trx);
  });
  return profile;
}

export async function changeProfileRole(
  id: string,
  role: Exclude<ProfileRole, 'owner'>
): Promise<Profile> {
  const profile = await loadProfile(id);
  if (profile.role === 'owner') {
    throw new Exception('Cannot change a company owner via role; use transfer ownership', {
      status: 422,
      code: 'E_OWNER_LOCKED',
    });
  }
  profile.role = role;
  await profile.save();
  return profile;
}

/* ---- impersonation ---- */
export async function impersonate(targetUserId: string, actingUser: User) {
  const target = await AdminQueries.findUser(targetUserId);
  if (!target) {
    throw new Exception('User not found', { status: 404, code: 'E_USER_NOT_FOUND' });
  }
  if (target.id === actingUser.id) {
    throw new Exception('Cannot impersonate yourself', { status: 422, code: 'E_SELF_IMPERSONATE' });
  }

  const token = await User.accessTokens.create(target, ['*'], {
    name: `impersonation:by:${actingUser.id}`,
    expiresIn: '1 hour',
  });

  console.info('[MockFlow][AUDIT] impersonation', {
    admin: actingUser.id,
    target: target.id,
    at: new Date().toISOString(),
  });

  return { token, target };
}
