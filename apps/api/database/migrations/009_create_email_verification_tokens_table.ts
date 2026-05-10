import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'email_verification_tokens';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token', 255).notNullable().unique();
      table.timestamp('expires_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
    });

    this.schema.raw('CREATE INDEX email_verification_tokens_user_id_idx ON email_verification_tokens (user_id)');
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
