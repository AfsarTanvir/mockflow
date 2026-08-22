import { Exception } from '@adonisjs/core/exceptions';
import db from '@adonisjs/lucid/services/db';

/**
 * Pagination primitives shared by the list queries.
 *
 * Two strategies, deliberately kept apart:
 *
 * - **offset** (`page` / `perPage`) — browsable directories where the caller
 *   wants a total, a page count and sorting by an arbitrary column (the admin
 *   tables). Easy to reason about, but `COUNT(*)` and deep `OFFSET` both scale
 *   with table size, and rows inserted mid-browse shift every later page.
 * - **keyset** (`cursor` / `limit`) — append-only, newest-first feeds
 *   (`request_logs`, `version_history`). Constant cost at any depth and immune
 *   to insert drift, at the price of no total and no jump-to-page.
 *
 * Rule of thumb: keyset for anything unbounded and time-ordered, offset for the
 * rest. A list that is bounded by product design (a scenario's rules, a
 * project's endpoints) needs neither.
 */

/* ------------------------------------------------------------------ */
/* offset                                                             */
/* ------------------------------------------------------------------ */

export const DEFAULT_PER_PAGE = 20;

export interface OffsetInput {
  page?: number;
  perPage?: number;
}

export interface OffsetParams {
  page: number;
  perPage: number;
}

export interface OffsetMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasMore: boolean;
}

export interface OffsetPage<T> {
  data: T[];
  meta: OffsetMeta;
}

/** The slice of Lucid's paginator this module depends on. */
interface Paginator<T> {
  all(): T[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasMorePages: boolean;
}

export function offsetParams(input: OffsetInput): OffsetParams {
  return { page: input.page ?? 1, perPage: input.perPage ?? DEFAULT_PER_PAGE };
}

/** Shape a Lucid paginator into the API's `{ data, meta }` offset envelope. */
export function offsetPage<T, R>(paginator: Paginator<T>, map: (row: T) => R): OffsetPage<R> {
  return {
    data: paginator.all().map(map),
    meta: {
      total: paginator.total,
      perPage: paginator.perPage,
      currentPage: paginator.currentPage,
      lastPage: paginator.lastPage,
      hasMore: paginator.hasMorePages,
    },
  };
}

/* ------------------------------------------------------------------ */
/* keyset (cursor)                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULT_CURSOR_LIMIT = 50;

export interface CursorInput {
  cursor?: string;
  limit?: number;
}

export interface CursorMeta {
  limit: number;
  hasMore: boolean;
  /** Opaque — hand it back as `?cursor=` to fetch the following page. */
  nextCursor: string | null;
}

export interface CursorPage<T> {
  data: T[];
  meta: CursorMeta;
}

/** A decoded keyset position: the `(created_at, id)` of the last row served. */
interface Position {
  at: string;
  id: string;
}

/** A resolved request for one keyset page. */
export interface Keyset {
  cursor: Position | null;
  limit: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `$extras` key holding a row's keyset timestamp.
 *
 * It is read back as TEXT at microsecond precision rather than through the
 * model's Luxon value: Luxon (like JS `Date`) truncates to milliseconds, and a
 * cursor one millisecond ahead of the row it points at silently skips every row
 * inside that millisecond. Rows written through Lucid happen to land on whole
 * milliseconds today; seeders and raw inserts do not.
 */
export const CURSOR_COLUMN = 'keyset_at';

/** `created_at` as a lossless, sortable UTC string, aliased to CURSOR_COLUMN. */
function selectKeysetAt(table: string) {
  return db.raw(
    `to_char(??.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as ${CURSOR_COLUMN}`,
    [table]
  );
}

export function encodeCursor(at: string, id: string): string {
  return Buffer.from(`${at}|${id}`, 'utf8').toString('base64url');
}

/** Decode a client-supplied cursor. Garbage is a 400, never a 500. */
export function decodeCursor(raw?: string): Position | null {
  if (!raw) return null;

  const parts = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  const [at, id] = parts;
  if (parts.length !== 2 || !at || !UUID_RE.test(id ?? '') || Number.isNaN(Date.parse(at))) {
    throw new Exception('Invalid pagination cursor', { status: 400, code: 'E_BAD_CURSOR' });
  }
  return { at, id };
}

export function resolveKeyset(input: CursorInput): Keyset {
  return { cursor: decodeCursor(input.cursor), limit: input.limit ?? DEFAULT_CURSOR_LIMIT };
}

/** The query-builder surface `applyKeyset` needs (Lucid model + db builders). */
interface KeysetQuery {
  select(...columns: any[]): unknown;
  whereRaw(sql: string, bindings: any[]): unknown;
  orderBy(column: string, direction: 'asc' | 'desc'): unknown;
  limit(value: number): unknown;
}

/**
 * Window a newest-first query onto one keyset page.
 *
 * The sort key is the `(created_at, id)` pair: `created_at` alone is not unique
 * — one transaction can stamp many rows identically — and a non-total order
 * serves tied rows twice or skips them entirely. One extra row is fetched as
 * the `hasMore` probe.
 *
 * The row-wise `(created_at, id) < (…)` comparison is what lets Postgres walk
 * the matching `(…, created_at DESC, id DESC)` index instead of re-sorting.
 */
export function applyKeyset(query: KeysetQuery, table: string, keyset: Keyset): void {
  query.select(`${table}.*`);
  query.select(selectKeysetAt(table));

  if (keyset.cursor) {
    query.whereRaw('(??.created_at, ??.id) < (?::timestamptz, ?::uuid)', [
      table,
      table,
      keyset.cursor.at,
      keyset.cursor.id,
    ]);
  }

  query.orderBy(`${table}.created_at`, 'desc');
  query.orderBy(`${table}.id`, 'desc');
  query.limit(keyset.limit + 1);
}

/** Drop the probe row and mint the cursor for the following page. */
export function cursorPage<T extends { id: string; $extras: Record<string, any> }, R>(
  rows: T[],
  keyset: Keyset,
  map: (row: T) => R
): CursorPage<R> {
  const hasMore = rows.length > keyset.limit;
  const page = hasMore ? rows.slice(0, keyset.limit) : rows;
  const last = page[page.length - 1];

  return {
    data: page.map(map),
    meta: {
      limit: keyset.limit,
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor(String(last.$extras[CURSOR_COLUMN]), last.id) : null,
    },
  };
}
