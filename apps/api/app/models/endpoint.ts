import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';

export default class Endpoint extends BaseModel {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column()
  declare method: string;

  @column()
  declare path: string;

  @column()
  declare statusCode: number;

  @column({
    prepare: (value) => (value !== null ? JSON.stringify(value) : null),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare responseBody: Record<string, unknown> | null;

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare responseHeaders: Record<string, string>;

  @column()
  declare delayMs: number;

  @column()
  declare delayMaxMs: number | null;

  @column()
  declare isActive: boolean;

  @column()
  declare createdBy: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;
}
