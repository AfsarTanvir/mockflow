import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Project from './project.js';
import User from './user.js';

export default class ProjectInvite extends BaseModel {
  static table = 'project_invites';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare projectId: string;

  @column()
  declare email: string;

  @column()
  declare role: 'admin' | 'member' | 'viewer';

  @column()
  declare token: string;

  @column()
  declare invitedBy: string | null;

  @column.dateTime()
  declare acceptedAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Project, { foreignKey: 'projectId' })
  declare project: BelongsTo<typeof Project>;

  @belongsTo(() => User, { foreignKey: 'invitedBy' })
  declare inviter: BelongsTo<typeof User>;
}
