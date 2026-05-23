import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Profile from './profile.js';

export interface ProfileLink {
  label: string;
  url: string;
}

export interface ProfilePreferences {
  notifications?: {
    email?: boolean;
    in_app?: boolean;
  };
  locale?: string;
  timezone?: string;
}

export default class ProfileMetadata extends BaseModel {
  public static table = 'profile_metadata';
  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  declare profileId: string;

  @column()
  declare jobTitle: string | null;

  @column()
  declare department: string | null;

  @column()
  declare phone: string | null;

  @column()
  declare bio: string | null;

  @column({
    prepare: (value) => JSON.stringify(value ?? []),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare links: ProfileLink[];

  @column({
    prepare: (value) => JSON.stringify(value ?? {}),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare preferences: ProfilePreferences;

  @column.dateTime()
  declare lastActiveAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Profile, { foreignKey: 'profileId' })
  declare profile: BelongsTo<typeof Profile>;
}
