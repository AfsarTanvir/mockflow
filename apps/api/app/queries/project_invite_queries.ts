import ProjectInvite from '#models/project_invite';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `project_invites`. Pure reads; optional trx client. */

/** Pending (not-yet-accepted) invites for a project, newest first. */
export function listPendingForProject(projectId: string, client?: TransactionClientContract) {
  return ProjectInvite.query({ client })
    .where('project_id', projectId)
    .whereNull('accepted_at')
    .orderBy('created_at', 'desc');
}

/** Pending invites sent to an email address (with project preloaded), newest first. */
export function listPendingForEmail(email: string, client?: TransactionClientContract) {
  return ProjectInvite.query({ client })
    .where('email', email)
    .whereNull('accepted_at')
    .preload('project')
    .orderBy('created_at', 'desc');
}

/** A pending invite by its token (with project preloaded). */
export function findPendingByToken(token: string, client?: TransactionClientContract) {
  return ProjectInvite.query({ client })
    .where('token', token)
    .whereNull('accepted_at')
    .preload('project')
    .first();
}

/** A pending invite to a given email on a project, if any. */
export function findPendingByEmail(
  projectId: string,
  email: string,
  client?: TransactionClientContract
) {
  return ProjectInvite.query({ client })
    .where('project_id', projectId)
    .where('email', email)
    .whereNull('accepted_at')
    .first();
}

/** A pending invite by id, scoped to its project. */
export function findPendingByIdInProject(
  projectId: string,
  inviteId: string,
  client?: TransactionClientContract
) {
  return ProjectInvite.query({ client })
    .where('project_id', projectId)
    .where('id', inviteId)
    .whereNull('accepted_at')
    .first();
}
