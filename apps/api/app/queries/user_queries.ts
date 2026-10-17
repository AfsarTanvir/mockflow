import User from '#models/user';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `users`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return User.find(id, { client });
}

export function findByEmail(email: string, client?: TransactionClientContract) {
  return User.findBy('email', email, { client });
}

/**
 * Look a user up by email for admin-facing flows. Emails aren't normalised at
 * signup, so prefer an exact match and fall back to a case-insensitive one.
 */
export async function findByEmailInsensitive(email: string, client?: TransactionClientContract) {
  const exact = await User.findBy('email', email, { client });
  if (exact) return exact;
  return User.query({ client })
    .whereRaw('lower(email) = ?', [email.toLowerCase()])
    .orderBy('created_at', 'asc')
    .first();
}
