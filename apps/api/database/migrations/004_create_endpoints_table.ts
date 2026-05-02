import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'endpoints';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('project_id')
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE');
      table.string('method', 10).notNullable();
      table.string('path', 500).notNullable();
      table.integer('status_code').defaultTo(200);
      table.jsonb('response_body').nullable();
      table.jsonb('response_headers').defaultTo('{}');
      table.integer('delay_ms').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['project_id', 'method', 'path']);
    });

    this.schema.raw('CREATE INDEX endpoints_project_id_idx ON endpoints (project_id)');
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
