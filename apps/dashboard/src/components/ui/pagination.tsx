import { Button } from '@/components/ui/button';

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
