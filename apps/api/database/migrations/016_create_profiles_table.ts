import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'profiles';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE');
      table.string('display_name', 120).notNullable();
      table.string('avatar_url', 500).nullable();
      table
        .enum('role', ['owner', 'admin', 'member', 'viewer'])
        .notNullable()
        .defaultTo('member');
      table
        .enum('status', ['active', 'suspended', 'inactive'])
        .notNullable()
        .defaultTo('active');
      table
        .enum('visibility', ['public', 'company_member_only'])
        .notNullable()
        .defaultTo('company_member_only');
      table.timestamp('joined_at', { useTz: true }).nullable();
      table.timestamp('left_at', { useTz: true }).nullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['user_id', 'company_id']);
    });

    this.schema.raw('CREATE INDEX profiles_company_status_idx ON profiles (company_id, status)');
    this.schema.raw(
      `CREATE INDEX profiles_public_visibility_idx ON profiles (visibility) WHERE visibility = 'public'`
    );
    // Mandatory invariant — exactly one owner per company
    this.schema.raw(
      `CREATE UNIQUE INDEX profiles_one_owner_per_company_idx ON profiles (company_id) WHERE role = 'owner'`
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
