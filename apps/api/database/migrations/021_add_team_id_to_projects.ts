import { BaseSchema } from '@adonisjs/lucid/schema';

/**
 * Team-owned projects. A project is either personal (team_id NULL, owned by the
 * user) or owned by a workspace team (team_id set). Existing rows stay personal.
 * Deleting a team cascades its projects. team_metadata gains a denormalized
 * project count, mirroring total_member / total_team.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('projects', (table) => {
      table.uuid('team_id').nullable().references('id').inTable('teams').onDelete('CASCADE');
      table.index('team_id', 'projects_team_id_idx');
    });

    this.schema.alterTable('team_metadata', (table) => {
      table.integer('total_project').notNullable().defaultTo(0);
    });
  }

  async down() {
    this.schema.alterTable('projects', (table) => {
      table.dropColumn('team_id');
    });
    this.schema.alterTable('team_metadata', (table) => {
      table.dropColumn('total_project');
    });
  }
}
