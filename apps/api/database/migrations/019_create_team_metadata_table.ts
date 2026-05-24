import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'team_metadata';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('team_id').primary().references('id').inTable('teams').onDelete('CASCADE');
      table.string('avatar_url', 500).nullable();
      table.string('color', 20).nullable();
      table.jsonb('external_links').notNullable().defaultTo('[]');
      table.jsonb('settings').notNullable().defaultTo('{}');
      table.integer('total_member').notNullable().defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
