import Team from '#models/team';
import TeamMetadata from '#models/team_metadata';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `teams` / `team_metadata`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return Team.find(id, { client });
}

export function listForCompanyWithMetadata(companyId: string, client?: TransactionClientContract) {
  return Team.query({ client })
    .where('company_id', companyId)
    .preload('metadata')
    .orderBy('created_at', 'asc');
}

export function findMetadata(teamId: string, client?: TransactionClientContract) {
  return TeamMetadata.find(teamId, { client });
}
