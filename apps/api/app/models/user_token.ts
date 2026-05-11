import { DateTime } from 'luxon';
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import User from './user.js';

export type UserTokenType = 'verify_email' | 'reset_password';

export default class UserToken extends BaseModel {
  static table = 'user_tokens';

  @column({ isPrimary: true })
  declare id: string;

  @column()
  declare userId: string;

  @column()
  declare type: UserTokenType;

  @column()
  declare token: string;

  @column.dateTime()
  declare expiresAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>;
}
