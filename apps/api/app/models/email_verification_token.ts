import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from './user.js';

export default class EmailVerificationToken extends BaseModel {
  static table = 'email_verification_tokens';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare userId: string;

  @column()
  declare token: string;

  @column.dateTime()
  declare expiresAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>;
}
