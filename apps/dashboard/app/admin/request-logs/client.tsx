'use client';

import { useState } from 'react';

import { useAdminRequestLogs } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { StatusCodeBadge } from '@/components/admin/admin-badges';
import { MethodBadge } from '@/components/dashboard/method-badge';
import { formatDate } from '@/lib/format';
import type { HttpMethod } from '@/types';
import type { AdminRequestLog } from '@/types/admin';

const METHODS: ('all' | HttpMethod)[] = ['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const selectClass =
  'border-border bg-background text-foreground h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function AdminRequestLogsClient() {
  const [page, setPage] = useState(1);
  // Logs accept no text search server-side; the method filter drives the list.
  const [method, setMethod] = useState<'all' | HttpMethod>('all');

  const { data, isLoading, isError, error } = useAdminRequestLogs({
    page,
    perPage: 20,
    method: method === 'all' ? undefined : method,
  });

  const columns: Column<AdminRequestLog>[] = [
    { header: 'Method', className: 'w-0', cell: (l) => <MethodBadge method={l.method} /> },
    {
      header: 'Path',
      cell: (l) => <span className="text-foreground font-mono text-xs">{l.path}</span>,
    },
    { header: 'Status', className: 'w-0', cell: (l) => <StatusCodeBadge code={l.statusCode} /> },
    {
      header: 'Duration',
      className: 'w-0 text-right tabular-nums',
      cell: (l) => <span className="text-muted-foreground">{l.duration}ms</span>,
    },
    {
      header: 'Project',
      cell: (l) => <span className="text-muted-foreground">{l.project?.name ?? '—'}</span>,
    },
    {
      header: 'When',
      className: 'w-0 text-right',
      cell: (l) => <span className="text-muted-foreground">{formatDate(l.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Request logs"
        description="Mock-server traffic across every project (most recent first)."
      />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(l) => l.id}
        emptyTitle="No request logs yet"
        emptyDescription="Traffic to mock endpoints will appear here."
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
