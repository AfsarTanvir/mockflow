import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'endpoint_scenarios';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('endpoint_id')
        .notNullable()
        .references('id')
        .inTable('endpoints')
        .onDelete('CASCADE');
      table.string('name', 80).notNullable();
      table.text('description').nullable();
      table.integer('status_code').nullable();
      table.jsonb('response_body').nullable();
      table.jsonb('response_headers').nullable();
      table.integer('delay_ms').nullable();
      table.integer('delay_max_ms').nullable();
      table.boolean('is_active').notNullable().defaultTo(false);
      table.integer('priority').notNullable().defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['endpoint_id', 'name']);
    });

    this.schema.raw(
      'CREATE INDEX endpoint_scenarios_endpoint_priority_idx ON endpoint_scenarios (endpoint_id, priority ASC)'
    );
    this.schema.raw(
      'CREATE UNIQUE INDEX endpoint_scenarios_one_active_idx ON endpoint_scenarios (endpoint_id) WHERE is_active = true'
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
