import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import Endpoint from './endpoint.js';
import ScenarioRule from './scenario_rule.js';

export default class EndpointScenario extends BaseModel {
  public static table = 'endpoint_scenarios';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare endpointId: string;

  @column()
  declare name: string;

  @column()
  declare description: string | null;

  @column()
  declare statusCode: number | null;

  @column({
    prepare: (value) => (value !== null && value !== undefined ? JSON.stringify(value) : null),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare responseBody: Record<string, unknown> | null;

  @column({
    prepare: (value) => (value !== null && value !== undefined ? JSON.stringify(value) : null),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare responseHeaders: Record<string, string> | null;

  @column()
  declare delayMs: number | null;

  @column()
  declare delayMaxMs: number | null;

  @column()
  declare isActive: boolean;

  @column()
  declare priority: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Endpoint, { foreignKey: 'endpointId' })
  declare endpoint: BelongsTo<typeof Endpoint>;

  @hasMany(() => ScenarioRule, { foreignKey: 'scenarioId' })
  declare rules: HasMany<typeof ScenarioRule>;
}
