import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations';
import Company from './company.js';
import Profile from './profile.js';
import TeamMetadata from './team_metadata.js';
import TeamMembership from './team_membership.js';

export type TeamVisibility = 'private' | 'company_member_only' | 'public';

export default class Team extends BaseModel {
  public static table = 'teams';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare companyId: string;

  @column()
  declare name: string;

  @column()
  declare slug: string;

  @column()
  declare description: string | null;

  @column()
  declare visibility: TeamVisibility;

  @column()
  declare createdByProfileId: string | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Company, { foreignKey: 'companyId' })
  declare company: BelongsTo<typeof Company>;

  @belongsTo(() => Profile, { foreignKey: 'createdByProfileId' })
  declare createdBy: BelongsTo<typeof Profile>;

  @hasOne(() => TeamMetadata, { foreignKey: 'teamId' })
  declare metadata: HasOne<typeof TeamMetadata>;

  @hasMany(() => TeamMembership, { foreignKey: 'teamId' })
  declare memberships: HasMany<typeof TeamMembership>;
}
