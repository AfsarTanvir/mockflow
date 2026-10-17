import { BaseSchema } from '@adonisjs/lucid/schema';

/**
 * Scheduled calls: a request to one of the project's own mock endpoints that the
 * external local-scheduler sends once (`run_at`) or repeatedly (`interval_seconds`).
 * The scheduler owns the live state (next run, run history); this row owns
 * authorization and the link back to the project.
 *
 * - Owned by the project (CASCADE). The endpoint link is SET NULL because a version
 *   restore deletes and re-creates every endpoint; the restore re-links by path.
 * - `token_hash` is the SHA-256 of the secret the scheduler sends in the
 *   `X-MockFlow-Schedule` header, which lets the call reach a private project's mock.
 */
export default class extends BaseSchema {
  protected tableName = 'scheduled_calls';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery);
      table
        .uuid('project_id')
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE');
      table
        .uuid('endpoint_id')
        .nullable()
        .references('id')
        .inTable('endpoints')
        .onDelete('SET NULL');
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('method', 10).notNullable();
      table.string('path', 500).notNullable();
      table.jsonb('request_headers').notNullable().defaultTo(JSON.stringify({}));
      table.text('request_body').nullable();
      table.string('mode', 10).notNullable();
      table.timestamp('run_at', { useTz: true }).nullable();
      table.integer('interval_seconds').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.string('scheduler_job_id', 64).notNullable();
      table.string('token_hash', 64).notNullable().unique();
      table.timestamp('created_at', { useTz: true }).notNullable();
      table.timestamp('updated_at', { useTz: true }).notNullable();
    });

    this.schema.raw(`
      ALTER TABLE scheduled_calls ADD CONSTRAINT scheduled_calls_mode_check CHECK (
        (mode = 'once' AND run_at IS NOT NULL AND interval_seconds IS NULL)
        OR (mode = 'repeat' AND interval_seconds >= 60 AND run_at IS NULL)
      )
    `);
    this.schema.raw(
      'CREATE INDEX scheduled_calls_project_id_idx ON scheduled_calls (project_id, created_at)'
    );
    this.schema.raw(
      'CREATE INDEX scheduled_calls_endpoint_id_idx ON scheduled_calls (endpoint_id)'
    );
    this.schema.raw('CREATE INDEX scheduled_calls_created_by_idx ON scheduled_calls (created_by)');
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
