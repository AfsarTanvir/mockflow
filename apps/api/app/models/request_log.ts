import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';
import Endpoint from './endpoint.js';

export default class RequestLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column()
  declare endpointId: string | null;

  @column()
  declare method: string;

  @column()
  declare path: string;

  @column()
  declare statusCode: number;

  @column()
  declare duration: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;

  @belongsTo(() => Endpoint, { foreignKey: 'endpointId' })
  declare endpoint: BelongsTo<typeof Endpoint>;
}
