import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'companies';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table.string('name', 120).notNullable();
      table.string('slug', 80).notNullable();
      table
        .enum('visibility', ['private', 'protected', 'public'])
        .notNullable()
        .defaultTo('private');
      table.string('logo_url', 500).nullable();
      table.string('avatar_url', 500).nullable();
      table
        .uuid('owner_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT');
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['slug']);
    });

    this.schema.raw('CREATE INDEX companies_owner_user_id_idx ON companies (owner_user_id)');
    this.schema.raw(
      `CREATE INDEX companies_visibility_idx ON companies (visibility) WHERE visibility IN ('protected', 'public')`
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
