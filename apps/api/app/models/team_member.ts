import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';
import User from './user.js';

export default class TeamMember extends BaseModel {
  static table = 'team_members';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column()
  declare userId: string;

  @column()
  declare role: 'owner' | 'admin' | 'member' | 'viewer';

  @column.dateTime()
  declare invitedAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>;
}
