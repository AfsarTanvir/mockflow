import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'company_metadata';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('company_id')
        .primary()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE');
      table.text('description').nullable();
      table.string('website', 255).nullable();
      table.string('industry', 80).nullable();
      table.string('size_bucket', 20).nullable();
      table.string('billing_email', 255).nullable();
      table.jsonb('billing_address').nullable();
      table.jsonb('settings').notNullable().defaultTo('{}');
      table.integer('total_member').notNullable().defaultTo(0);
      table.integer('total_team').notNullable().defaultTo(0);
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
