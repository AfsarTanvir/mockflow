import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import EndpointScenario from './endpoint_scenario.js';

export type RuleSource = 'header' | 'query' | 'body';
export type RuleOperator = 'equals' | 'exists';

export default class ScenarioRule extends BaseModel {
  public static table = 'scenario_rules';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare scenarioId: string;

  @column()
  declare source: RuleSource;

  @column()
  declare field: string;

  @column()
  declare operator: RuleOperator;

  @column()
  declare value: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => EndpointScenario, { foreignKey: 'scenarioId' })
  declare scenario: BelongsTo<typeof EndpointScenario>;
}
