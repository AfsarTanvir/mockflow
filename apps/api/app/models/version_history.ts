import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';
import User from './user.js';

export type VersionSnapshot = {
  project: {
    name: string;
    slug: string;
    basePath: string;
    isPublic: boolean;
    settings: { cors: boolean; log_requests: boolean };
  };
  endpoints: Array<{
    method: string;
    path: string;
    statusCode: number;
    responseBody: Record<string, unknown> | null;
    responseHeaders: Record<string, string>;
    delayMs: number;
    isActive: boolean;
  }>;
};

export default class VersionHistory extends BaseModel {
  static table = 'version_history';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column({
    prepare: (value) => JSON.stringify(value),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare snapshot: VersionSnapshot;

  @column()
  declare message: string | null;

  @column()
  declare createdBy: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare author: BelongsTo<typeof User>;
}
