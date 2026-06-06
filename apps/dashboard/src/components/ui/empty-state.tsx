import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'bg-card flex flex-col items-center justify-center rounded-xl border p-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="bg-muted text-muted-foreground mb-3 flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </div>
      )}
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
