import { cn } from '@/lib/utils';
import type { HttpMethod } from '@/types';

/**
 * HTTP-method pill. Colors come from the --method-* design tokens
 * (styles/globals.css), so they're defined in one place and adapt to dark mode.
 */
const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-method-get/10 text-method-get',
  POST: 'bg-method-post/10 text-method-post',
  PUT: 'bg-method-put/10 text-method-put',
  PATCH: 'bg-method-patch/10 text-method-patch',
  DELETE: 'bg-method-delete/10 text-method-delete',
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
