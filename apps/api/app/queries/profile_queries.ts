import Profile from '#models/profile';
import ProfileMetadata from '#models/profile_metadata';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `profiles` / `profile_metadata`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return Profile.find(id, { client });
}

/** The requester's ACTIVE profile in a company (the "actor" lookup), or null. */
export function findActiveByUserAndCompany(
  userId: string,
  companyId: string,
  client?: TransactionClientContract
) {
  return Profile.query({ client })
    .where('user_id', userId)
    .where('company_id', companyId)
    .where('status', 'active')
    .first();
}

/** A user's profile in a company (any status) with metadata preloaded. */
export function findByUserAndCompanyWithMetadata(
  userId: string,
  companyId: string,
  client?: TransactionClientContract
) {
  return Profile.query({ client })
    .where('user_id', userId)
    .where('company_id', companyId)
    .preload('metadata')
    .first();
}

/** A user's active profiles across companies (with company preloaded), newest first. */
export function listActiveForUserWithCompany(userId: string, client?: TransactionClientContract) {
  return Profile.query({ client })
    .where('user_id', userId)
    .where('status', 'active')
    .preload('company')
    .orderBy('created_at', 'desc');
}

/** All profiles in a company (role then creation order) with metadata preloaded. */
export function listForCompanyWithMetadata(companyId: string, client?: TransactionClientContract) {
  return Profile.query({ client })
    .where('company_id', companyId)
    .preload('metadata')
    .orderBy('role', 'asc')
    .orderBy('created_at', 'asc');
}

export function findMetadata(profileId: string, client?: TransactionClientContract) {
  return ProfileMetadata.find(profileId, { client });
}
