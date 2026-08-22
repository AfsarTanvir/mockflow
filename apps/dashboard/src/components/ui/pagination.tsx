import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Two paginators, matching the two server-side strategies:
 *
 * - `Pagination` — offset pages (`page`/`perPage`). Has a total and a page
 *   count, so it can render "Page 3 of 12". Used by the admin directories.
 * - `CursorPagination` / `LoadMore` — keyset pages. No total and no jump-to-page
 *   by construction; the feed only knows whether more rows exist. Used by the
 *   append-only feeds (request logs, version history).
 */

export interface PageMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasMore: boolean;
}

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <p className="text-muted-foreground text-xs">{meta.total} total</p>
      {meta.lastPage > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.currentPage <= 1}
            onClick={() => onPageChange(meta.currentPage - 1)}
          >
            Prev
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {meta.currentPage} of {meta.lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta.hasMore}
            onClick={() => onPageChange(meta.currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/** Prev/next over keyset pages. `page` is 1-based and display-only. */
export function CursorPagination({
  page,
  shown,
  hasPrev,
  hasNext,
  isFetching,
  onPrev,
  onNext,
}: {
  page: number;
  shown: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <p className="text-muted-foreground text-xs">
        {shown} shown
        {isFetching && <Loader2 className="ml-2 inline size-3 animate-spin" />}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev || isFetching} onClick={onPrev}>
          Prev
        </Button>
        <span className="text-muted-foreground text-xs">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!hasNext || isFetching} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

/** Append-the-next-page control for feeds rendered as one growing list. */
export function LoadMore({
  hasMore,
  isFetching,
  onLoadMore,
  label = 'Load more',
}: {
  hasMore: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  label?: string;
}) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" size="sm" disabled={isFetching} onClick={onLoadMore}>
        {isFetching && <Loader2 className="mr-2 size-3.5 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}
