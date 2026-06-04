import UserToken from '#models/user_token';
import type { UserTokenType } from '#models/user_token';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `user_tokens` (email verification + password reset). */

export function findByTokenAndType(
  token: string,
  type: UserTokenType,
  client?: TransactionClientContract
) {
  return UserToken.query({ client }).where('token', token).where('type', type).first();
}

/** Remove all tokens of a type for a user (before issuing a fresh one). */
export function deleteForUserAndType(
  userId: string,
  type: UserTokenType,
  client?: TransactionClientContract
) {
  return UserToken.query({ client }).where('user_id', userId).where('type', type).delete();
}
