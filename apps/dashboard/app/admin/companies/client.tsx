'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import { useAdminCompanies, useAdminDeleteCompany } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PersonCell } from '@/components/admin/person-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { AdminCompany } from '@/types/admin';

export function AdminCompaniesClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);
  const confirm = useConfirm();

  const { data, isLoading, isError, error } = useAdminCompanies({
    page,
    perPage: 20,
    search: search || undefined,
  });
  const deleteCompany = useAdminDeleteCompany();

  async function handleDelete(company: AdminCompany) {
    const ok = await confirm({
      title: `Delete ${company.name}?`,
      description:
        'This permanently deletes the company and all of its profiles, teams and projects. This cannot be undone.',
      confirmText: 'Delete company',
      destructive: true,
    });
    if (ok) await deleteCompany.mutateAsync(company.id);
  }

  const columns: Column<AdminCompany>[] = [
    {
      header: 'Company',
      cell: (c) => (
        <div className="min-w-0">
          <p className="text-foreground truncate font-medium">{c.name}</p>
          <p className="text-muted-foreground truncate text-xs">/{c.slug}</p>
        </div>
      ),
    },
    { header: 'Owner', cell: (c) => <PersonCell name={c.owner?.name} email={c.owner?.email} /> },
    {
      header: 'Visibility',
      className: 'w-0',
      cell: (c) => (
        <Badge variant="outline" className="capitalize">
          {c.visibility}
        </Badge>
      ),
    },
    {
      header: 'Members',
      className: 'w-0 text-right tabular-nums',
      cell: (c) => c.totalMember,
    },
    {
      header: 'Teams',
      className: 'w-0 text-right tabular-nums',
      cell: (c) => c.totalTeam,
    },
    {
      header: 'Created',
      className: 'w-0 text-right whitespace-nowrap',
      cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Companies"
        description="Every workspace on the platform, with its owner and member counts."
      />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(c) => c.id}
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or slug…"
        emptyTitle="No companies found"
        renderActions={(c) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Company actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleDelete(c)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
    </div>
  );
}
