'use client';

import { useState } from 'react';
import { Database, Eye, Trash2 } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminListView, type Column } from '@/components/admin/admin-list-view';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useAdminCacheEntry,
  useAdminCacheKeys,
  useAdminCacheOverview,
  useAdminDeleteCacheKey,
  useAdminDeleteCacheSection,
  useAdminFlushCache,
} from '@/query/admin/cache';
import type { CacheKeyInfo } from '@/types/admin';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTtl(ttl: number): string {
  if (ttl === -1) return 'no expiry';
  if (ttl < 0) return '—';
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.round(ttl / 60)}m`;
  return `${Math.round(ttl / 3600)}h`;
}

export function AdminCacheClient() {
  const confirm = useConfirm();
  const [section, setSection] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);
  const [page, setPage] = useState(1);
  const [viewKey, setViewKey] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useAdminCacheOverview();
  const { data, isLoading, isError } = useAdminCacheKeys({
    section: section === 'all' ? undefined : section,
    search: search || undefined,
    page,
    perPage: 20,
  });
  const { data: entry, isLoading: entryLoading } = useAdminCacheEntry(viewKey);

  const deleteKey = useAdminDeleteCacheKey();
  const deleteSection = useAdminDeleteCacheSection();
  const flush = useAdminFlushCache();

  async function handleFlush() {
    const ok = await confirm({
      title: 'Flush the entire cache?',
      description:
        'Every cached key is removed. Reads simply repopulate from the database — safe, but the cache starts cold.',
      confirmText: 'Flush all',
      destructive: true,
    });
    if (ok) await flush.mutateAsync();
  }

  async function handleClearSection(name: string) {
    const ok = await confirm({
      title: `Clear "${name}"?`,
      description:
        'Removes every key in this section. They repopulate from the database on next read.',
      confirmText: 'Clear section',
      destructive: true,
    });
    if (ok) await deleteSection.mutateAsync(name);
  }

  async function handleDeleteKey(key: string) {
    const ok = await confirm({
      title: 'Delete this key?',
      description: key,
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) await deleteKey.mutateAsync(key);
  }

  const columns: Column<CacheKeyInfo>[] = [
    { header: 'Key', cell: (r) => <span className="font-mono text-xs">{r.key}</span> },
    {
      header: 'TTL',
      className: 'w-0',
      cell: (r) => <span className="text-xs">{formatTtl(r.ttl)}</span>,
    },
    {
      header: 'Type',
      className: 'w-0',
      cell: (r) => (
        <Badge variant="muted" className="text-[10px]">
          {r.type}
        </Badge>
      ),
    },
    {
      header: 'Size',
      className: 'w-0 text-right',
      cell: (r) => <span className="text-muted-foreground text-xs">{formatBytes(r.size)}</span>,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <AdminPageHeader
        title="Cache"
        description="Inspect and clear the Redis cache."
        action={
          <Button variant="outline" onClick={handleFlush} disabled={flush.isPending}>
            <Trash2 className="mr-2 size-4" />
            Flush all
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        {overviewLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <MetricCard
              label="Hit rate (24h)"
              value={`${Math.round((overview?.hitRate ?? 0) * 100)}%`}
              hint={`${overview?.hits ?? 0} hits · ${overview?.misses ?? 0} misses`}
            />
            <MetricCard label="Keys" value={String(overview?.totalKeys ?? 0)} />
            <MetricCard
              label="Memory"
              value={formatBytes(overview?.totalMemory ?? 0)}
              hint={
                overview?.connected ? (
                  <Badge variant="success">Redis connected</Badge>
                ) : (
                  <Badge variant="destructive">Redis offline</Badge>
                )
              }
            />
          </>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <h2 className="text-foreground text-sm font-semibold">Sections</h2>
        <div className="bg-card divide-y rounded-xl border">
          {(overview?.sections ?? []).map((s) => (
            <div key={s.name} className="flex items-center justify-between px-4 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setSection(s.name);
                  setPage(1);
                }}
                className="hover:text-primary text-left font-mono text-xs"
              >
                {s.name}
              </button>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-xs">
                  {s.keys} keys · {formatBytes(s.memory)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={s.keys === 0 || deleteSection.isPending}
                  onClick={() => handleClearSection(s.name)}
                >
                  Clear
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key browser */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">Keys</h2>
          {section !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSection('all');
                setPage(1);
              }}
            >
              Clear filter ({section})
            </Button>
          )}
        </div>
        {data?.meta.truncated && (
          <p className="text-muted-foreground text-xs">
            Showing the first {data.meta.total} keys (scan capped) — narrow with search or a
            section.
          </p>
        )}
        <AdminListView
          columns={columns}
          rows={data?.data}
          meta={data?.meta}
          isLoading={isLoading}
          isError={isError}
          onPageChange={setPage}
          rowKey={(r) => r.key}
          search={searchInput}
          onSearchChange={(v) => {
            setSearchInput(v);
            setPage(1);
          }}
          searchPlaceholder="Search keys…"
          emptyTitle="No cached keys"
          emptyDescription="Nothing matches this section/search."
          renderActions={(r) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setViewKey(r.key)}>
                <Eye className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteKey(r.key)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        />
      </div>

      {/* Value drawer */}
      <Dialog open={!!viewKey} onOpenChange={(open) => !open && setViewKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm break-all">{viewKey}</DialogTitle>
            <DialogDescription>
              {entry
                ? `${entry.type} · ${formatBytes(entry.size)} · TTL ${formatTtl(entry.ttl)}`
                : '…'}
            </DialogDescription>
          </DialogHeader>
          {entryLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <pre className="bg-muted max-h-[60vh] overflow-auto rounded-lg p-3 text-xs">
              {prettyValue(entry?.value)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground text-2xl font-semibold">{value}</p>
        {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function prettyValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return '(empty)';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
