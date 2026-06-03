import Endpoint from '#models/endpoint';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `endpoints`. Pure reads + scoped writes; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return Endpoint.find(id, { client });
}

export function listForProject(projectId: string, client?: TransactionClientContract) {
  return Endpoint.query({ client }).where('project_id', projectId).orderBy('created_at', 'asc');
}

/** An existing endpoint with the same (method, path) in the project, optionally excluding one id. */
export function findConflict(
  projectId: string,
  method: string,
  path: string,
  excludeId?: string,
  client?: TransactionClientContract
) {
  const query = Endpoint.query({ client })
    .where('project_id', projectId)
    .where('method', method)
    .where('path', path);
  if (excludeId) {
    query.whereNot('id', excludeId);
  }
  return query.first();
}

/** Remove every endpoint for a project (used when restoring a version snapshot). */
export function deleteForProject(projectId: string, client?: TransactionClientContract) {
  return Endpoint.query({ client }).where('project_id', projectId).delete();
}
