import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Team from './team.js';
import Profile from './profile.js';

export type TeamRole = 'admin' | 'member';

export default class TeamMembership extends BaseModel {
  public static table = 'team_memberships';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare teamId: string;

  @column()
  declare profileId: string;

  @column()
  declare role: TeamRole;

  @column.dateTime()
  declare joinedAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Team, { foreignKey: 'teamId' })
  declare team: BelongsTo<typeof Team>;

  @belongsTo(() => Profile, { foreignKey: 'profileId' })
  declare profile: BelongsTo<typeof Profile>;
}
