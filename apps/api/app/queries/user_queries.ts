import User from '#models/user';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `users`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return User.find(id, { client });
}

export function findByEmail(email: string, client?: TransactionClientContract) {
  return User.findBy('email', email, { client });
}
