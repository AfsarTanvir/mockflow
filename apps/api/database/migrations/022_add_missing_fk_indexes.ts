import { BaseSchema } from '@adonisjs/lucid/schema';

/**
 * Index foreign-key columns that are filtered/joined on but were unindexed:
 *   - team_members.user_id        — GET /api/projects (listForUser) filters by
 *     user_id alone; the composite unique (project_id, user_id) can't serve it.
 *   - request_logs.endpoint_id    — endpoint deletion (ON DELETE SET NULL) and
 *     admin log filtering scan this column.
 *   - teams.created_by_profile_id — profile deletion (ON DELETE SET NULL) scans it.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('team_members', (table) => {
      table.index('user_id', 'team_members_user_id_idx');
    });
    this.schema.alterTable('request_logs', (table) => {
      table.index('endpoint_id', 'request_logs_endpoint_id_idx');
    });
    this.schema.alterTable('teams', (table) => {
      table.index('created_by_profile_id', 'teams_created_by_profile_id_idx');
    });
  }

  async down() {
    this.schema.alterTable('team_members', (table) => {
      table.dropIndex('user_id', 'team_members_user_id_idx');
    });
    this.schema.alterTable('request_logs', (table) => {
      table.dropIndex('endpoint_id', 'request_logs_endpoint_id_idx');
    });
    this.schema.alterTable('teams', (table) => {
      table.dropIndex('created_by_profile_id', 'teams_created_by_profile_id_idx');
    });
  }
}
