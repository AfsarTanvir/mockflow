import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'projects';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table.string('name', 100).notNullable();
      table.string('slug', 120).notNullable().unique();
      table.string('base_path', 255).defaultTo('/');
      table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('is_public').defaultTo(false);
      table.jsonb('settings').defaultTo(JSON.stringify({ cors: true, log_requests: false }));
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    this.schema.raw('CREATE INDEX projects_owner_id_idx ON projects (owner_id)');
    this.schema.raw('CREATE UNIQUE INDEX projects_slug_idx ON projects (slug)');
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
