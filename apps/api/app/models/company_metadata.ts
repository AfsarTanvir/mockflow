import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import Company from './company.js';

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
}

export interface CompanySettings {
  locale?: string;
  timezone?: string;
  members_can_create_teams?: boolean;
  members_can_create_projects?: boolean;
}

export default class CompanyMetadata extends BaseModel {
  public static table = 'company_metadata';
  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  declare companyId: string;

  @column()
  declare description: string | null;

  @column()
  declare website: string | null;

  @column()
  declare industry: string | null;

  @column()
  declare sizeBucket: string | null;

  @column()
  declare billingEmail: string | null;

  @column({
    prepare: (value) => (value !== null && value !== undefined ? JSON.stringify(value) : null),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare billingAddress: BillingAddress | null;

  @column({
    prepare: (value) => JSON.stringify(value ?? {}),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare settings: CompanySettings;

  @column()
  declare totalMember: number;

  @column()
  declare totalTeam: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Company, { foreignKey: 'companyId' })
  declare company: BelongsTo<typeof Company>;
}
