'use client';

import { useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAdminPurgeCacheScope } from '@/query/admin/cache';
import type { CacheScope } from '@/types/admin';

/**
 * Row action for admin lists: clear everything cached for one project / team /
 * company. Always safe — cleared values rebuild from Postgres on the next read —
 * so there's no confirm step; the result shows inline for a few seconds.
 */
export function ClearCacheButton({ scope, id }: { scope: CacheScope; id: string }) {
  const purge = useAdminPurgeCacheScope();
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(t);
  }, [result]);

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-muted-foreground whitespace-nowrap text-xs">{result}</span>}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Clear cached data for this ${scope}`}
        title={`Clear cached data for this ${scope}`}
        disabled={purge.isPending}
        onClick={() =>
          purge.mutate(
            { scope, id },
            {
              onSuccess: (r) =>
                setResult(r.deleted === 0 ? 'Nothing cached' : `Cleared ${r.deleted}`),
              onError: (e) => setResult(e.message),
            }
          )
        }
      >
        <Eraser className="size-4" />
      </Button>
    </div>
  );
}
