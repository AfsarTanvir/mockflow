import { cn } from '@/lib/utils';
import type { HttpMethod } from '@/types';

/**
 * HTTP-method pill. Methods keep distinct, conventional colors (GET=blue,
 * POST=green, …) but as token-relative tints that adapt to dark mode — no flat
 * palette literals scattered across screens.
 */
const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  POST: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  PUT: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PATCH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function MethodBadge({ method, className }: { method: HttpMethod; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded px-2 py-1 font-mono text-xs font-bold',
        METHOD_STYLES[method],
        className
      )}
    >
      {method}
    </span>
  );
}
