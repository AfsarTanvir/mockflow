import env from '#start/env';
import { ROLE_RANK, type ProjectRole } from '#services/access_service';
import * as CompanyQueries from '#queries/company_queries';
import * as ProfileQueries from '#queries/profile_queries';
import type Profile from '#models/profile';
import type User from '#models/user';

/**
 * Platform super-admin resolution for the "master agency" console.
 *
 * A super-admin is any user with an ACTIVE profile (role >= MASTER_COMPANY_MIN_ROLE,
 * default 'admin') in the company designated by env MASTER_COMPANY_SLUG. This reuses
 * the existing Profile/company model — no platform role table or user column.
 *
 * If MASTER_COMPANY_SLUG is unset or points at a missing company, the feature is
 * dormant and nobody is a super-admin.
 */

// Slug -> id is effectively immutable, so memoize positive hits for the process.
let masterCompanyIdCache: string | null = null;

export function clearMasterCompanyCache(): void {
  masterCompanyIdCache = null;
}

async function resolveMasterCompanyId(): Promise<string | null> {
  if (masterCompanyIdCache) return masterCompanyIdCache;
  const slug = env.get('MASTER_COMPANY_SLUG');
  if (!slug) return null;
  const company = await CompanyQueries.findBySlug(slug);
  if (!company) return null; // misconfigured — treated as dormant; not cached
  masterCompanyIdCache = company.id;
  return company.id;
}

/** The acting super-admin's profile in the master company, or null if not a super-admin. */
export async function resolveSuperAdmin(user: User): Promise<Profile | null> {
  const companyId = await resolveMasterCompanyId();
  if (!companyId) return null;

  const profile = await ProfileQueries.findActiveByUserAndCompany(user.id, companyId);
  if (!profile) return null;

  const minRole = (env.get('MASTER_COMPANY_MIN_ROLE') ?? 'admin') as ProjectRole;
  if (ROLE_RANK[profile.role as ProjectRole] < ROLE_RANK[minRole]) return null;

  return profile;
}

export async function isSuperAdmin(user: User): Promise<boolean> {
  return (await resolveSuperAdmin(user)) !== null;
}
