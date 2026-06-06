'use client';

import { useState } from 'react';
import { CheckCircle2, UserCog } from 'lucide-react';

import { useAdminImpersonate, useAdminUsers } from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PersonCell } from '@/components/admin/person-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { startImpersonation } from '@/lib/impersonation';
import { formatDate } from '@/lib/format';
import type { AdminUser } from '@/types/admin';

export function AdminUsersClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);
  const confirm = useConfirm();

  const { data, isLoading, isError, error } = useAdminUsers({
    page,
    perPage: 20,
    search: search || undefined,
  });
  const impersonate = useAdminImpersonate();

  async function handleImpersonate(user: AdminUser) {
    const ok = await confirm({
      title: `Impersonate ${user.name}?`,
      description:
        'You will be signed in as this user for up to 1 hour. A banner lets you exit back to admin at any time.',
      confirmText: 'Impersonate',
    });
    if (!ok) return;
    const result = await impersonate.mutateAsync(user.id);
    startImpersonation(result.user.name, result.token);
    window.location.href = '/dashboard';
  }

  const columns: Column<AdminUser>[] = [
    { header: 'User', cell: (u) => <PersonCell name={u.name} email={u.email} /> },
    {
      header: 'Verified',
      className: 'w-0',
      cell: (u) =>
        u.emailVerified ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="size-3" /> Verified
          </Badge>
        ) : (
          <Badge variant="muted">Unverified</Badge>
        ),
    },
    {
      header: 'Joined',
      className: 'w-0 text-right',
      cell: (u) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Users"
        description="Every account on the platform. Impersonate to debug as a specific user."
      />
      <AdminListView
        columns={columns}
        rows={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error?.message}
        onPageChange={setPage}
        rowKey={(u) => u.id}
        search={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name or email…"
        emptyTitle="No users found"
        emptyDescription="Try a different search term."
        renderActions={(u) => (
          <Button
            variant="outline"
            size="sm"
            disabled={impersonate.isPending}
            onClick={() => handleImpersonate(u)}
          >
            <UserCog className="size-3.5" />
            Impersonate
          </Button>
        )}
      />
    </div>
  );
}
