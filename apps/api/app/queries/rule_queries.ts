import ScenarioRule from '#models/scenario_rule';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

/** Data-access for `scenario_rules`. Pure reads; optional trx client. */

export function findById(id: string, client?: TransactionClientContract) {
  return ScenarioRule.find(id, { client });
}

export function listForScenario(scenarioId: string, client?: TransactionClientContract) {
  return ScenarioRule.query({ client })
    .where('scenario_id', scenarioId)
    .orderBy('created_at', 'asc');
}
