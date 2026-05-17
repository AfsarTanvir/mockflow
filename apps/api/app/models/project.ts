import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from './user.js';

export default class Project extends BaseModel {
  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare name: string;

  @column()
  declare slug: string;

  @column()
  declare basePath: string;

  @column()
  declare ownerId: string;

  @column()
  declare isPublic: boolean;

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare settings: {
    cors: boolean;
    log_requests: boolean;
    global_headers?: Record<string, string>;
  };

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>;
}
