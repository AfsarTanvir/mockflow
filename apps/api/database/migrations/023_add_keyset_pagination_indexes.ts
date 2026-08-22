import { BaseSchema } from '@adonisjs/lucid/schema';

/**
 * Indexes for keyset (cursor) pagination on the two append-only feeds.
 *
 * Cursor pages window on `(created_at, id) < (?, ?)` and order by
 * `created_at DESC, id DESC`, so the whole sort key has to be indexed —
 * including the `id` tiebreaker that makes the order total. The existing
 * indexes stop one column short:
 *   - request_logs   (project_id, created_at DESC)  → + id DESC
 *   - version_history(project_id)                   → + created_at DESC, id DESC
 * which leaves Postgres re-sorting every candidate row on each page.
 *
 * `request_logs_created_at_keyset_idx` serves the unscoped admin firehose
 * (`GET /api/admin/request-logs`), which has no project_id predicate at all.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw('DROP INDEX IF EXISTS request_logs_project_id_created_at_idx');
    this.schema.raw(
      'CREATE INDEX request_logs_project_id_keyset_idx ON request_logs (project_id, created_at DESC, id DESC)'
    );
    this.schema.raw(
      'CREATE INDEX request_logs_created_at_keyset_idx ON request_logs (created_at DESC, id DESC)'
    );

    this.schema.raw('DROP INDEX IF EXISTS version_history_project_id_idx');
    this.schema.raw(
      'CREATE INDEX version_history_project_id_keyset_idx ON version_history (project_id, created_at DESC, id DESC)'
    );
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS request_logs_created_at_keyset_idx');
    this.schema.raw('DROP INDEX IF EXISTS request_logs_project_id_keyset_idx');
    this.schema.raw(
      'CREATE INDEX request_logs_project_id_created_at_idx ON request_logs (project_id, created_at DESC)'
    );

    this.schema.raw('DROP INDEX IF EXISTS version_history_project_id_keyset_idx');
    this.schema.raw('CREATE INDEX version_history_project_id_idx ON version_history (project_id)');
  }
}
