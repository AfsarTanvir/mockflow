import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'profile_metadata';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('profile_id').primary().references('id').inTable('profiles').onDelete('CASCADE');
      table.string('job_title', 120).nullable();
      table.string('department', 80).nullable();
      table.string('phone', 40).nullable();
      table.text('bio').nullable();
      table.jsonb('links').notNullable().defaultTo('[]');
      table.jsonb('preferences').notNullable().defaultTo('{}');
      table.timestamp('last_active_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
