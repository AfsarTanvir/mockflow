import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'team_memberships';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE');
      table
        .uuid('profile_id')
        .notNullable()
        .references('id')
        .inTable('profiles')
        .onDelete('CASCADE');
      table.enum('role', ['admin', 'member']).notNullable().defaultTo('member');
      table.timestamp('joined_at', { useTz: true }).notNullable();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();

      table.unique(['team_id', 'profile_id']);
    });

    this.schema.raw(
      'CREATE INDEX team_memberships_profile_id_idx ON team_memberships (profile_id)'
    );
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
