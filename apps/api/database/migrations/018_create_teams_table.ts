import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'teams';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE');
      table.string('name', 120).notNullable();
      table.string('slug', 80).notNullable();
      table.text('description').nullable();
      table
        .enum('visibility', ['private', 'company_member_only', 'public'])
        .notNullable()
        .defaultTo('private');
      table
        .uuid('created_by_profile_id')
        .nullable()
        .references('id')
        .inTable('profiles')
        .onDelete('SET NULL');
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['company_id', 'slug']);
    });

    this.schema.raw('CREATE INDEX teams_company_id_idx ON teams (company_id)');
    this.schema.raw(
      `CREATE INDEX teams_public_visibility_idx ON teams (visibility) WHERE visibility = 'public'`
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
