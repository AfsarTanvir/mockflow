import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Team from './team.js';

export interface TeamExternalLink {
  label: string;
  url: string;
}

export interface TeamSettings {
  notify_on_member_add?: boolean;
  notify_on_member_remove?: boolean;
}

export default class TeamMetadata extends BaseModel {
  public static table = 'team_metadata';
  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  declare teamId: string;

  @column()
  declare avatarUrl: string | null;

  @column()
  declare color: string | null;

  @column({
    prepare: (value) => JSON.stringify(value ?? []),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare externalLinks: TeamExternalLink[];

  @column({
    prepare: (value) => JSON.stringify(value ?? {}),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare settings: TeamSettings;

  @column()
  declare totalMember: number;

  @column()
  declare totalProject: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Team, { foreignKey: 'teamId' })
  declare team: BelongsTo<typeof Team>;
}
