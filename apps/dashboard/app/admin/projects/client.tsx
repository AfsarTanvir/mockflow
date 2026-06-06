'use client';

import { useState } from 'react';

import { useAdminProjects } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PersonCell } from '@/components/admin/person-cell';
import { Badge } from '@/components/ui/badge';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { AdminProject } from '@/types/admin';

export function AdminProjectsClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);

  const { data, isLoading, isError, error } = useAdminProjects({
    page,
    perPage: 20,
    search: search || undefined,
  });

  const columns: Column<AdminProject>[] = [
    {
      header: 'Project',
      cell: (p) => (
        <div className="min-w-0">
          <p className="text-foreground truncate font-medium">{p.name}</p>
          <p className="text-muted-foreground truncate text-xs">/{p.slug}</p>
        </div>
      ),
    },
    { header: 'Owner', cell: (p) => <PersonCell name={p.owner?.name} email={p.owner?.email} /> },
    {
      header: 'Visibility',
      className: 'w-0',
      cell: (p) => (
        <Badge variant={p.isPublic ? 'info' : 'muted'}>{p.isPublic ? 'Public' : 'Private'}</Badge>
      ),
    },
    {
      header: 'Created',
      className: 'w-0 text-right whitespace-nowrap',
      cell: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader title="Projects" description="Every mock-API project on the platform." />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(p) => p.id}
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or slug…"
        emptyTitle="No projects found"
      />
    </div>
  );
}
