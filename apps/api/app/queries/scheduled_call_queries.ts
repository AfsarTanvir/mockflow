import ScheduledCall from '#models/scheduled_call';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `scheduled_calls`. Pure reads + scoped writes; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return ScheduledCall.find(id, { client });
}

export function findByTokenHash(tokenHash: string, client?: TransactionClientContract) {
  return ScheduledCall.query({ client }).where('token_hash', tokenHash).first();
}

export function findByIds(ids: string[], client?: TransactionClientContract) {
  return ScheduledCall.query({ client }).whereIn('id', ids);
}

export function listForProject(projectId: string, client?: TransactionClientContract) {
  return ScheduledCall.query({ client })
    .where('project_id', projectId)
    .orderBy('created_at', 'asc');
}

export async function countForProject(
  projectId: string,
  client?: TransactionClientContract
): Promise<number> {
  const row = await ScheduledCall.query({ client })
    .where('project_id', projectId)
    .count('* as total')
    .first();
  return Number(row?.$extras.total ?? 0);
}

/** Scheduler job ids of every scheduled call in a project (collected before a project delete). */
export async function jobIdsForProject(
  projectId: string,
  client?: TransactionClientContract
): Promise<string[]> {
  const rows = await ScheduledCall.query({ client })
    .where('project_id', projectId)
    .select('scheduler_job_id');
  return rows.map((r) => r.schedulerJobId);
}

/** Delete an endpoint's scheduled calls; returns their scheduler job ids. */
export async function deleteForEndpoint(
  endpointId: string,
  client?: TransactionClientContract
): Promise<string[]> {
  const rows = await ScheduledCall.query({ client })
    .where('endpoint_id', endpointId)
    .select('scheduler_job_id');
  await ScheduledCall.query({ client }).where('endpoint_id', endpointId).delete();
  return rows.map((r) => r.schedulerJobId);
}

/** Delete scheduled calls by id; returns their scheduler job ids. */
export async function deleteByIds(
  ids: string[],
  client?: TransactionClientContract
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await ScheduledCall.query({ client }).whereIn('id', ids).select('scheduler_job_id');
  await ScheduledCall.query({ client }).whereIn('id', ids).delete();
  return rows.map((r) => r.schedulerJobId);
}
