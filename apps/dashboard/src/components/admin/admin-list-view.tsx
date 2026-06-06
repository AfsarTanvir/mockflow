'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, type PageMeta } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Applied to both the header and body cells (alignment, width, etc.). */
  className?: string;
}

interface AdminListViewProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  meta: PageMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onPageChange: (page: number) => void;
  rowKey: (row: T) => string;
  /** When provided, a search box is rendered and wired to these handlers. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Extra filter controls rendered in the toolbar (right of the search box). */
  toolbar?: ReactNode;
  /** Optional trailing actions column. */
  renderActions?: (row: T) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AdminListView<T>({
  columns,
  rows,
  meta,
  isLoading,
  isError,
  errorMessage,
  onPageChange,
  rowKey,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  toolbar,
  renderActions,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
}: AdminListViewProps<T>) {
  const colCount = columns.length + (renderActions ? 1 : 0);
  const showToolbar = Boolean(onSearchChange) || Boolean(toolbar);

  return (
    <div className="space-y-4">
      {showToolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {onSearchChange && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c, i) => (
                <TableHead key={i} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {renderActions && <TableHead className="w-0 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, r) => (
                <TableRow key={`s-${r}`} className="hover:bg-transparent">
                  {Array.from({ length: colCount }).map((__, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && isError && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="text-destructive py-10 text-center text-sm"
                >
                  {errorMessage ?? 'Failed to load data.'}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              rows?.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c, i) => (
                    <TableCell key={i} className={cn(c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell className="text-right whitespace-nowrap">
                      {renderActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!isLoading && !isError && rows && rows.length === 0 && (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="rounded-none border-0"
          />
        )}
      </div>

      {meta && rows && rows.length > 0 && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}
