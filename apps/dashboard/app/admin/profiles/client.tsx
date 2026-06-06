'use client';

import { useState } from 'react';
import { Ban, MoreHorizontal, RotateCcw, ShieldX, UserMinus } from 'lucide-react';

import {
  useAdminChangeProfileRole,
  useAdminDeleteProfile,
  useAdminProfiles,
  useAdminReactivateProfile,
  useAdminSuspendProfile,
} from '@/query/admin';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { RoleBadge, StatusBadge } from '@/components/admin/admin-badges';
import { PersonCell } from '@/components/admin/person-cell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { ProfileRole, ProfileStatus } from '@/types';
import type { AdminProfile } from '@/types/admin';

const STATUSES: ('all' | ProfileStatus)[] = ['all', 'active', 'suspended', 'inactive'];
const ROLES: ('all' | ProfileRole)[] = ['all', 'owner', 'admin', 'member', 'viewer'];
const ASSIGNABLE_ROLES: Exclude<ProfileRole, 'owner'>[] = ['admin', 'member', 'viewer'];

const selectClass =
  'border-border bg-background text-foreground h-8 rounded-lg border px-2 text-sm capitalize outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function AdminProfilesClient() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<'all' | ProfileStatus>('all');
  const [role, setRole] = useState<'all' | ProfileRole>('all');
  const search = useDebouncedValue(searchInput, 300);
  const confirm = useConfirm();

  const { data, isLoading, isError, error } = useAdminProfiles({
    page,
    perPage: 20,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    role: role === 'all' ? undefined : role,
  });

  const suspend = useAdminSuspendProfile();
  const reactivate = useAdminReactivateProfile();
  const remove = useAdminDeleteProfile();
  const changeRole = useAdminChangeProfileRole();

  async function handleSuspend(p: AdminProfile) {
    const ok = await confirm({
      title: `Suspend ${p.displayName}?`,
      description: 'The member loses access until reactivated.',
      confirmText: 'Suspend',
      destructive: true,
    });
    if (ok) await suspend.mutateAsync(p.id);
  }

  async function handleRemove(p: AdminProfile) {
    const ok = await confirm({
      title: `Deactivate ${p.displayName}?`,
      description: 'Removes the member from teams and marks the profile inactive.',
      confirmText: 'Deactivate',
      destructive: true,
    });
    if (ok) await remove.mutateAsync(p.id);
  }

  const columns: Column<AdminProfile>[] = [
    {
      header: 'Profile',
      cell: (p) => <span className="text-foreground font-medium">{p.displayName}</span>,
    },
    { header: 'User', cell: (p) => <PersonCell name={p.user?.name} email={p.user?.email} /> },
    {
      header: 'Company',
      cell: (p) =>
        p.company ? (
          <span className="text-muted-foreground">{p.company.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { header: 'Role', className: 'w-0', cell: (p) => <RoleBadge role={p.role} /> },
    { header: 'Status', className: 'w-0', cell: (p) => <StatusBadge status={p.status} /> },
    {
      header: 'Joined',
      className: 'w-0 text-right whitespace-nowrap',
      cell: (p) => <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Profiles"
        description="Company memberships across every workspace. Manage roles and access here."
      />
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
        searchPlaceholder="Search by display name…"
        emptyTitle="No profiles found"
        toolbar={
          <>
            <select
              aria-label="Filter by status"
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as 'all' | ProfileStatus);
                setPage(1);
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All statuses' : s}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by role"
              className={selectClass}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as 'all' | ProfileRole);
                setPage(1);
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All roles' : r}
                </option>
              ))}
            </select>
          </>
        }
        renderActions={(p) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Profile actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              {p.role === 'owner' ? (
                <DropdownMenuItem disabled>
                  <ShieldX className="mr-2 size-4" />
                  Owner — transfer first
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={p.role}
                        onValueChange={(value) =>
                          changeRole.mutate({
                            id: p.id,
                            role: value as Exclude<ProfileRole, 'owner'>,
                          })
                        }
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <DropdownMenuRadioItem key={r} value={r} className="capitalize">
                            {r}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  {p.status === 'active' ? (
                    <DropdownMenuItem onClick={() => handleSuspend(p)}>
                      <Ban className="mr-2 size-4" />
                      Suspend
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => reactivate.mutate(p.id)}>
                      <RotateCcw className="mr-2 size-4" />
                      Reactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleRemove(p)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="mr-2 size-4" />
                    Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
    </div>
  );
}
