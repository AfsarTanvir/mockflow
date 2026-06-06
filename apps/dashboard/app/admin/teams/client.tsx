'use client';

import { useState } from 'react';

import { useAdminTeams } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { AdminTeam } from '@/types/admin';

export function AdminTeamsClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);

  const { data, isLoading, isError, error } = useAdminTeams({
    page,
    perPage: 20,
    search: search || undefined,
  });

  const columns: Column<AdminTeam>[] = [
    {
      header: 'Team',
      cell: (t) => (
        <div className="min-w-0">
          <p className="text-foreground truncate font-medium">{t.name}</p>
          <p className="text-muted-foreground truncate text-xs">/{t.slug}</p>
        </div>
      ),
    },
    {
      header: 'Company',
      cell: (t) => <span className="text-muted-foreground">{t.company?.name ?? '—'}</span>,
    },
    {
      header: 'Visibility',
      className: 'w-0',
      cell: (t) => (
        <Badge variant="outline" className="capitalize">
          {t.visibility.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      header: 'Members',
      className: 'w-0 text-right tabular-nums',
      cell: (t) => t.totalMember,
    },
    {
      header: 'Created',
      className: 'w-0 text-right',
      cell: (t) => <span className="text-muted-foreground">{formatDate(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader title="Teams" description="Every team across all workspaces." />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(t) => t.id}
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or slug…"
        emptyTitle="No teams found"
      />
    </div>
  );
}
