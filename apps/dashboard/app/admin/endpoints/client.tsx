'use client';

import { useState } from 'react';

import { useAdminEndpoints } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusCodeBadge } from '@/components/admin/admin-badges';
import { MethodBadge } from '@/components/dashboard/method-badge';
import { Badge } from '@/components/ui/badge';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { HttpMethod } from '@/types';
import type { AdminEndpoint } from '@/types/admin';

const METHODS: ('all' | HttpMethod)[] = ['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const selectClass =
  'border-border bg-background text-foreground h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function AdminEndpointsClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [method, setMethod] = useState<'all' | HttpMethod>('all');
  const search = useDebouncedValue(searchInput, 300);

  const { data, isLoading, isError, error } = useAdminEndpoints({
    page,
    perPage: 20,
    search: search || undefined,
    method: method === 'all' ? undefined : method,
  });

  const columns: Column<AdminEndpoint>[] = [
    { header: 'Method', className: 'w-0', cell: (e) => <MethodBadge method={e.method} /> },
    {
      header: 'Path',
      cell: (e) => <span className="text-foreground font-mono text-xs">{e.path}</span>,
    },
    {
      header: 'Project',
      cell: (e) => <span className="text-muted-foreground">{e.project?.name ?? '—'}</span>,
    },
    { header: 'Status', className: 'w-0', cell: (e) => <StatusCodeBadge code={e.statusCode} /> },
    {
      header: 'Active',
      className: 'w-0',
      cell: (e) =>
        e.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Off</Badge>,
    },
    {
      header: 'Created',
      className: 'w-0 text-right whitespace-nowrap',
      cell: (e) => <span className="text-muted-foreground">{formatDate(e.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Endpoints"
        description="Every mock endpoint defined across projects."
      />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(e) => e.id}
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        searchPlaceholder="Search by path…"
        emptyTitle="No endpoints found"
        toolbar={
          <select
            aria-label="Filter by method"
            className={selectClass}
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as 'all' | HttpMethod);
              setPage(1);
            }}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? 'All methods' : m}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}
