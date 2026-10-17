'use client';

import { useState, type FormEvent } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useAdminCacheScopeKeys, useAdminPurgeCacheScope } from '@/query/admin/cache';
import type { CacheScope } from '@/types/admin';

const SCOPES: CacheScope[] = ['project', 'team', 'company'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Inspect or clear everything cached for one project / team / company, by id.
 * Backed by the per-scope tag index, so it touches only that scope's keys.
 */
export function CacheScopeCard() {
  const [scope, setScope] = useState<CacheScope>('project');
  const [idInput, setIdInput] = useState('');
  const [lookup, setLookup] = useState<{ scope: CacheScope; id: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const id = idInput.trim();
  const validId = UUID_RE.test(id);
  const keys = useAdminCacheScopeKeys(lookup?.scope ?? scope, lookup?.id ?? null);
  const purge = useAdminPurgeCacheScope();

  function handleLookup(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setLookup({ scope, id });
  }

  function handleClear() {
    setResult(null);
    purge.mutate(
      { scope, id },
      {
        onSuccess: (r) => {
          setResult(
            r.deleted === 0
              ? `Nothing was cached for this ${scope}.`
              : `Cleared ${r.deleted} cached ${r.deleted === 1 ? 'key' : 'keys'}.`
          );
          setLookup({ scope, id });
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clear by project, team or company</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="cacheScope">Scope</Label>
            <select
              id="cacheScope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as CacheScope);
                setLookup(null);
                setResult(null);
              }}
              className="border-input bg-background focus:ring-ring h-9 w-full rounded-lg border px-3 text-sm capitalize focus:outline-hidden focus:ring-2 sm:w-36"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cacheScopeId">ID</Label>
            <Input
              id="cacheScopeId"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={idInput}
              onChange={(e) => {
                setIdInput(e.target.value);
                setLookup(null);
                setResult(null);
              }}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={!validId}>
              Show keys
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!validId || purge.isPending}
              onClick={handleClear}
            >
              {purge.isPending ? 'Clearing…' : 'Clear'}
            </Button>
          </div>
        </form>
        <p className="text-muted-foreground text-xs">
          A company covers its public page and every team project&apos;s mock; a team covers its
          projects. Cleared values rebuild from the database on the next request.
        </p>
        {purge.error && <Alert variant="destructive">{purge.error.message}</Alert>}
        {result && <p className="text-success text-xs">{result}</p>}
        {lookup && !keys.isLoading && keys.data && (
          <div className="bg-muted/40 rounded-lg border p-3">
            {keys.data.keys.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Nothing cached for this {lookup.scope}.
              </p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {keys.data.keys.map((k) => (
                  <li key={k} className="text-foreground truncate">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {keys.error && <Alert variant="destructive">{keys.error.message}</Alert>}
      </CardContent>
    </Card>
  );
}
