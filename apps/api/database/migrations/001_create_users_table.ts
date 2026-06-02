import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table.string('name', 100).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).nullable();
      table.string('avatar_url').nullable();
      table.boolean('email_verified').defaultTo(false);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    // `email` is already indexed by the inline .unique() constraint above; no extra index needed.
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
