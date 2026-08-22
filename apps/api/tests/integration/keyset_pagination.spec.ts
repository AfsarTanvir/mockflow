import { test } from '@japa/runner';
import { Exception } from '@adonisjs/core/exceptions';
import db from '@adonisjs/lucid/services/db';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Project from '#models/project';
import * as AdminQueries from '#queries/admin_queries';
import * as RequestLogService from '#services/request_log_service';
import * as VersionQueries from '#queries/version_queries';
import * as VersionService from '#services/version_service';
import {
  cursorPage,
  decodeCursor,
  encodeCursor,
  resolveKeyset,
  type CursorPage,
} from '#queries/pagination';

/**
 * The keyset (cursor) contract for the append-only feeds. The invariant every
 * test here defends is: walking the cursor visits every row exactly once, no
 * matter how the timestamps tie or how much precision they carry.
 */
test.group('keyset pagination', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function seedProject() {
    const id = uniq();
    const owner = await User.create({
      name: `U ${id}`,
      email: `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    const project = await Project.create({
      name: 'P',
      slug: `p-${id}`,
      basePath: '/',
      ownerId: owner.id,
      isPublic: false,
      settings: { cors: true, log_requests: true, global_headers: {} },
    });
    return { owner, project };
  }

  /** Raw insert so the test controls `created_at` down to the microsecond. */
  async function insertLog(projectId: string, createdAt: string, path: string) {
    await db.rawQuery(
      `insert into request_logs (project_id, method, path, status_code, duration, created_at)
       values (?, 'GET', ?, 200, 1, ?::timestamptz)`,
      [projectId, path, createdAt]
    );
  }

  async function insertVersion(
    projectId: string,
    createdAt: string,
    message: string,
    endpoints: unknown[] = []
  ) {
    await db.rawQuery(
      `insert into version_history (project_id, snapshot, message, created_at)
       values (?, ?::jsonb, ?, ?::timestamptz)`,
      [projectId, JSON.stringify({ project: {}, endpoints }), message, createdAt]
    );
  }

  /** Walk every page and return the rows in order, plus the page count. */
  async function walk<T>(
    fetch: (cursor?: string) => Promise<CursorPage<T>>
  ): Promise<{ rows: T[]; pages: number }> {
    const rows: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const page = await fetch(cursor);
      rows.push(...page.data);
      cursor = page.meta.nextCursor ?? undefined;
      pages += 1;
      // Guard against a broken cursor turning the walk into an infinite loop.
      if (pages > 50) throw new Error('cursor walk did not terminate');
    } while (cursor);

    return { rows, pages };
  }

  /* ---------------- cursor codec ---------------- */

  test('a cursor round-trips through encode/decode', async ({ assert }) => {
    const at = '2026-08-21T10:20:30.123456Z';
    const id = '11111111-2222-3333-4444-555555555555';

    const decoded = decodeCursor(encodeCursor(at, id));
    assert.deepEqual(decoded, { at, id });
  });

  test('an absent cursor decodes to null', async ({ assert }) => {
    assert.isNull(decodeCursor(undefined));
    assert.isNull(decodeCursor(''));
  });

  test('a malformed cursor is a 400, not a 500', async ({ assert }) => {
    const garbage = [
      'not-base64-at-all!!',
      Buffer.from('no-separator').toString('base64url'),
      // Well-formed shape, but the id is not a uuid.
      encodeCursor('2026-08-21T10:20:30.123456Z', 'nope'),
      // Well-formed shape, but the timestamp is not a date.
      encodeCursor('never', '11111111-2222-3333-4444-555555555555'),
    ];

    for (const raw of garbage) {
      try {
        decodeCursor(raw);
        assert.fail(`expected "${raw}" to be rejected`);
      } catch (error) {
        assert.instanceOf(error, Exception);
        assert.equal((error as Exception).status, 400);
      }
    }
  });

  /* ---------------- request logs ---------------- */

  test('paging a project log feed visits every row exactly once', async ({ assert }) => {
    const { owner, project } = await seedProject();
    for (let i = 0; i < 7; i += 1) {
      await insertLog(project.id, `2026-08-21T10:00:0${i}.000000Z`, `/p${i}`);
    }

    const { rows, pages } = await walk((cursor) =>
      RequestLogService.listForProject(project.id, owner.id, { cursor, limit: 3 })
    );

    assert.lengthOf(rows, 7);
    assert.lengthOf(new Set(rows.map((r) => r.id)), 7);
    assert.equal(pages, 3);
    // Newest first.
    assert.deepEqual(
      rows.map((r) => r.path),
      ['/p6', '/p5', '/p4', '/p3', '/p2', '/p1', '/p0']
    );
  });

  test('rows sharing one timestamp are not duplicated or skipped', async ({ assert }) => {
    const { owner, project } = await seedProject();
    // A single mock burst can stamp many rows identically — created_at alone is
    // not a total order, so the id tiebreaker is what keeps the walk honest.
    const sameInstant = '2026-08-21T11:00:00.000000Z';
    for (let i = 0; i < 5; i += 1) {
      await insertLog(project.id, sameInstant, `/tie${i}`);
    }

    const { rows } = await walk((cursor) =>
      RequestLogService.listForProject(project.id, owner.id, { cursor, limit: 2 })
    );

    assert.lengthOf(rows, 5);
    assert.lengthOf(new Set(rows.map((r) => r.id)), 5);
  });

  test('sub-millisecond timestamps are not skipped', async ({ assert }) => {
    const { owner, project } = await seedProject();
    // All four land inside the same millisecond. A cursor carrying only
    // millisecond precision would drop the three after the first.
    for (const us of ['000', '250', '500', '750']) {
      await insertLog(project.id, `2026-08-21T12:00:00.123${us}Z`, `/us${us}`);
    }

    const { rows } = await walk((cursor) =>
      RequestLogService.listForProject(project.id, owner.id, { cursor, limit: 1 })
    );

    assert.deepEqual(
      rows.map((r) => r.path),
      ['/us750', '/us500', '/us250', '/us000']
    );
  });

  test('the last page reports hasMore false and a null cursor', async ({ assert }) => {
    const { owner, project } = await seedProject();
    await insertLog(project.id, '2026-08-21T13:00:00.000000Z', '/only');

    const page = await RequestLogService.listForProject(project.id, owner.id, { limit: 10 });

    assert.lengthOf(page.data, 1);
    assert.isFalse(page.meta.hasMore);
    assert.isNull(page.meta.nextCursor);
    assert.equal(page.meta.limit, 10);
  });

  test('a full page still reports hasMore when more rows exist', async ({ assert }) => {
    const { owner, project } = await seedProject();
    for (let i = 0; i < 4; i += 1) {
      await insertLog(project.id, `2026-08-21T14:00:0${i}.000000Z`, `/h${i}`);
    }

    const page = await RequestLogService.listForProject(project.id, owner.id, { limit: 2 });

    assert.lengthOf(page.data, 2);
    assert.isTrue(page.meta.hasMore);
    assert.isNotNull(page.meta.nextCursor);
  });

  test('the log view never leaks the keyset extras', async ({ assert }) => {
    const { owner, project } = await seedProject();
    await insertLog(project.id, '2026-08-21T15:00:00.000000Z', '/clean');

    const page = await RequestLogService.listForProject(project.id, owner.id, { limit: 5 });

    assert.notProperty(page.data[0]!, 'keyset_at');
    assert.notProperty(page.data[0]!, '$extras');
  });

  test('a stranger cannot page a project log feed', async ({ assert }) => {
    const { project } = await seedProject();
    const { owner: stranger } = await seedProject();

    await assert.rejects(() =>
      RequestLogService.listForProject(project.id, stranger.id, { limit: 5 })
    );
  });

  /* ---------------- version history ---------------- */

  test('paging version history visits every snapshot exactly once', async ({ assert }) => {
    const { owner, project } = await seedProject();
    for (let i = 0; i < 5; i += 1) {
      await insertVersion(project.id, `2026-08-21T16:00:0${i}.000000Z`, `v${i}`);
    }

    const { rows, pages } = await walk((cursor) =>
      VersionService.listForProject(project.id, owner.id, { cursor, limit: 2 })
    );

    assert.lengthOf(rows, 5);
    assert.equal(pages, 3);
    assert.deepEqual(
      rows.map((r) => r.message),
      ['v4', 'v3', 'v2', 'v1', 'v0']
    );
  });

  test('version history is no longer capped at 50', async ({ assert }) => {
    const { owner, project } = await seedProject();
    for (let i = 0; i < 55; i += 1) {
      await insertVersion(
        project.id,
        `2026-08-21T17:00:00.${String(i).padStart(6, '0')}Z`,
        `v${i}`
      );
    }

    const { rows } = await walk((cursor) =>
      VersionService.listForProject(project.id, owner.id, { cursor, limit: 25 })
    );

    assert.lengthOf(rows, 55);
  });

  test('endpointCount is counted in SQL without loading the snapshot', async ({ assert }) => {
    const { owner, project } = await seedProject();
    // A fat snapshot: the list must report 3 without pulling these bodies back.
    const fat = [1, 2, 3].map((i) => ({
      method: 'GET',
      path: `/e${i}`,
      statusCode: 200,
      responseBody: { blob: 'x'.repeat(5000) },
      responseHeaders: {},
      delayMs: 0,
      isActive: true,
    }));
    await insertVersion(project.id, '2026-08-21T19:00:00.000000Z', 'fat', fat);
    await insertVersion(project.id, '2026-08-21T19:00:01.000000Z', 'empty', []);

    const page = await VersionService.listForProject(project.id, owner.id, { limit: 10 });

    assert.deepEqual(
      page.data.map((v) => [v.message, v.endpointCount]),
      [
        ['empty', 0],
        ['fat', 3],
      ]
    );
  });

  test('a version list row never carries the snapshot blob', async ({ assert }) => {
    const { project } = await seedProject();
    await insertVersion(project.id, '2026-08-21T19:10:00.000000Z', 'v', [{ path: '/x' }]);

    const keyset = resolveKeyset({ limit: 5 });
    const rows = await VersionQueries.listForProject(project.id, keyset);

    assert.isUndefined(rows[0]!.snapshot);
    assert.equal(Number(rows[0]!.$extras[VersionQueries.ENDPOINT_COUNT_COLUMN]), 1);
  });

  /* ---------------- limit clamping ---------------- */

  test('an out-of-range limit is clamped, not trusted', async ({ assert }) => {
    assert.equal(resolveKeyset({ limit: 100_000 }).limit, 100);
    assert.equal(resolveKeyset({ limit: 0 }).limit, 1);
    assert.equal(resolveKeyset({ limit: -5 }).limit, 1);
    assert.equal(resolveKeyset({}).limit, 50);
  });

  /* ---------------- admin firehose ---------------- */

  test('the admin log firehose pages across projects and honours filters', async ({ assert }) => {
    const a = await seedProject();
    const b = await seedProject();
    for (let i = 0; i < 3; i += 1) {
      await insertLog(a.project.id, `2026-08-21T18:00:0${i}.000000Z`, `/a${i}`);
      await insertLog(b.project.id, `2026-08-21T18:10:0${i}.000000Z`, `/b${i}`);
    }

    const scoped = await walk(async (cursor) => {
      const keyset = resolveKeyset({ cursor, limit: 2 });
      const rows = await AdminQueries.listRequestLogs({ projectId: a.project.id }, keyset);
      return cursorPage(rows, keyset, (l) => ({ id: l.id, path: l.path }));
    });

    assert.lengthOf(scoped.rows, 3);
    assert.deepEqual(
      scoped.rows.map((r) => r.path),
      ['/a2', '/a1', '/a0']
    );
  });
});
