import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';

export type ScheduleMode = 'once' | 'repeat';

export default class ScheduledCall extends BaseModel {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column()
  declare endpointId: string | null;

  @column()
  declare createdBy: string | null;

  @column()
  declare method: string;

  /** Concrete request path (params filled in, optional query string), e.g. `/users/42?x=1`. */
  @column()
  declare path: string;

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare requestHeaders: Record<string, string>;

  @column()
  declare requestBody: string | null;

  @column()
  declare mode: ScheduleMode;

  @column.dateTime()
  declare runAt: DateTime | null;

  @column()
  declare intervalSeconds: number | null;

  @column()
  declare isActive: boolean;

  @column({ serializeAs: null })
  declare schedulerJobId: string;

  @column({ serializeAs: null })
  declare tokenHash: string;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;
}
