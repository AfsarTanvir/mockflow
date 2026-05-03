import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'project_invites';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('project_id')
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE');
      table.string('email', 255).notNullable();
      table.enum('role', ['admin', 'member', 'viewer']).notNullable().defaultTo('member');
      table.string('token', 255).notNullable().unique();
      table.uuid('invited_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('accepted_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
