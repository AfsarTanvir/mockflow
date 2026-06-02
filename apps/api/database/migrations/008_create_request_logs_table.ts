import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'request_logs';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('project_id')
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE');
      table
        .uuid('endpoint_id')
        .nullable()
        .references('id')
        .inTable('endpoints')
        .onDelete('SET NULL');
      table.string('method', 10).notNullable();
      table.string('path', 500).notNullable();
      table.integer('status_code').notNullable();
      table.integer('duration').notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
    });

    this.schema.raw(
      'CREATE INDEX request_logs_project_id_created_at_idx ON request_logs (project_id, created_at DESC)'
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
