import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations';
import User from './user.js';
import Company from './company.js';
import ProfileMetadata from './profile_metadata.js';

export type ProfileRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProfileStatus = 'active' | 'suspended' | 'inactive';
export type ProfileVisibility = 'public' | 'company_member_only';

export default class Profile extends BaseModel {
  public static table = 'profiles';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare userId: string;

  @column()
  declare companyId: string;

  @column()
  declare displayName: string;

  @column()
  declare avatarUrl: string | null;

  @column()
  declare role: ProfileRole;

  @column()
  declare status: ProfileStatus;

  @column()
  declare visibility: ProfileVisibility;

  @column.dateTime()
  declare joinedAt: DateTime | null;

  @column.dateTime()
  declare leftAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>;

  @belongsTo(() => Company, { foreignKey: 'companyId' })
  declare company: BelongsTo<typeof Company>;

  @hasOne(() => ProfileMetadata, { foreignKey: 'profileId' })
  declare metadata: HasOne<typeof ProfileMetadata>;
}
