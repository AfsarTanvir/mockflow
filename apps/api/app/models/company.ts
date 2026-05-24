import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations';
import User from './user.js';
import CompanyMetadata from './company_metadata.js';
import Profile from './profile.js';
import Team from './team.js';

export type CompanyVisibility = 'private' | 'protected' | 'public';

export default class Company extends BaseModel {
  public static table = 'companies';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare name: string;

  @column()
  declare slug: string;

  @column()
  declare visibility: CompanyVisibility;

  @column()
  declare logoUrl: string | null;

  @column()
  declare avatarUrl: string | null;

  @column()
  declare ownerUserId: string;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'ownerUserId' })
  declare owner: BelongsTo<typeof User>;

  @hasOne(() => CompanyMetadata, { foreignKey: 'companyId' })
  declare metadata: HasOne<typeof CompanyMetadata>;

  @hasMany(() => Profile, { foreignKey: 'companyId' })
  declare members: HasMany<typeof Profile>;

  @hasMany(() => Team, { foreignKey: 'companyId' })
  declare teams: HasMany<typeof Team>;
}
