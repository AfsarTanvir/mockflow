'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Status = 'checking' | 'up' | 'down';

/** Live "API online" dot for the footer: pings GET /health once a minute; no answer in 5 s counts as offline. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => alive && setStatus(r.ok ? 'up' : 'down'))
        .catch(() => alive && setStatus('down'));
    check();
    const id = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const label = { checking: 'Checking API…', up: 'API online', down: 'API offline' }[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs" role="status">
      <span className="relative flex h-2 w-2">
        {status === 'up' && (
          <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            status === 'up' && 'bg-success',
            status === 'down' && 'bg-destructive',
            status === 'checking' && 'bg-muted-foreground'
          )}
        />
      </span>
      {label}
    </span>
  );
}
