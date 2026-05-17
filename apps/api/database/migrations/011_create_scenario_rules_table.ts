import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'scenario_rules';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('scenario_id')
        .notNullable()
        .references('id')
        .inTable('endpoint_scenarios')
        .onDelete('CASCADE');
      table.string('source', 10).notNullable(); // 'header' | 'query' | 'body'
      table.string('field', 255).notNullable();
      table.string('operator', 10).notNullable(); // 'equals' | 'exists'
      table.text('value').nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
    });

    this.schema.raw('CREATE INDEX scenario_rules_scenario_id_idx ON scenario_rules (scenario_id)');
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
