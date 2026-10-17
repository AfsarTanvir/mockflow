import { Button } from '@/components/ui/button';
import { badgeVariants } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Endpoint } from '@/types';
import { MethodBadge } from './method-badge';
import { EndpointForm, type EndpointFormPayload } from './endpoint-form';
import { ScenariosManager } from './scenarios-manager';
import { ScheduledCallsPanel } from './scheduled-calls-panel';

export type SchedulerAvailability = { available: boolean; message: string };

interface EndpointRowProps {
  endpoint: Endpoint;
  projectId: string;
  mockBaseUrl: string;
  canWrite: boolean;
  isEditing: boolean;
  isScenariosOpen: boolean;
  isSchedulesOpen: boolean;
  scheduler: SchedulerAvailability;
  isUpdating: boolean;
  updateError?: Error | null;
  onToggle: (id: string) => void;
  onEditClick: (id: string) => void;
  onScenariosClick: (id: string) => void;
  onSchedulesClick: (id: string) => void;
  onDelete: (endpoint: Endpoint) => void;
  onUpdate: (id: string, data: EndpointFormPayload) => void;
}

export function EndpointRow({
  endpoint: ep,
  projectId,
  mockBaseUrl,
  canWrite,
  isEditing,
  isScenariosOpen,
  isSchedulesOpen,
  scheduler,
  isUpdating,
  updateError,
  onToggle,
  onEditClick,
  onScenariosClick,
  onSchedulesClick,
  onDelete,
  onUpdate,
}: EndpointRowProps) {
  const expanded = isEditing || isScenariosOpen || isSchedulesOpen;
  // An open panel stays closable even if the scheduler goes away meanwhile.
  const scheduleDisabled = !scheduler.available && !isSchedulesOpen;
  const scheduleButton = (
    <Button
      variant="ghost"
      size="sm"
      data-active={isSchedulesOpen ? '' : undefined}
      className="data-[active]:text-primary"
      disabled={scheduleDisabled}
      onClick={() => onSchedulesClick(ep.id)}
    >
      {isSchedulesOpen ? 'Close' : 'Schedule'}
    </Button>
  );
  const statusLabel = ep.isActive ? 'Active' : 'Inactive';

  return (
    <div
      className={cn(
        'bg-card overflow-hidden rounded-xl border transition-opacity',
        !ep.isActive && 'opacity-60'
      )}
    >
      <div
        className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 p-4', expanded && 'border-b')}
      >
        <MethodBadge method={ep.method} />

        <div className="min-w-0 flex-1 basis-48">
          <p className="text-foreground truncate font-mono text-sm">{ep.path}</p>
          <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
            {mockBaseUrl}
            {ep.path}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{ep.statusCode}</span>
          {ep.delayMs > 0 && (
            <span className="text-muted-foreground hidden sm:inline">
              {ep.delayMaxMs != null ? `${ep.delayMs}-${ep.delayMaxMs}ms` : `${ep.delayMs}ms`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canWrite ? (
            <button
              type="button"
              onClick={() => onToggle(ep.id)}
              className={cn(
                badgeVariants({ variant: ep.isActive ? 'success' : 'muted' }),
                'cursor-pointer'
              )}
            >
              {statusLabel}
            </button>
          ) : (
            <span className={cn(badgeVariants({ variant: ep.isActive ? 'success' : 'muted' }))}>
              {statusLabel}
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            data-active={isScenariosOpen ? '' : undefined}
            className="data-[active]:text-primary"
            onClick={() => onScenariosClick(ep.id)}
          >
            {isScenariosOpen ? 'Close' : 'Scenarios'}
          </Button>

          {scheduleDisabled ? (
            // Disabled buttons get no pointer events, so the wrapper carries the tooltip.
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
                {scheduleButton}
              </TooltipTrigger>
              <TooltipContent>{scheduler.message}</TooltipContent>
            </Tooltip>
          ) : (
            scheduleButton
          )}

          {canWrite && (
            <>
              <Button
                variant="ghost"
                size="sm"
                data-active={isEditing ? '' : undefined}
                className="data-[active]:text-primary"
                onClick={() => onEditClick(ep.id)}
              >
                {isEditing ? 'Close' : 'Edit'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(ep)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && canWrite && (
        <div className="px-4 py-5 sm:px-6">
          <EndpointForm
            mode="edit"
            initialValues={ep}
            onSubmit={(data) => onUpdate(ep.id, data)}
            onCancel={() => onEditClick(ep.id)}
            isPending={isUpdating}
            error={updateError}
          />
        </div>
      )}

      {isScenariosOpen && (
        <div className="px-4 py-5 sm:px-6">
          <ScenariosManager endpointId={ep.id} canWrite={canWrite} />
        </div>
      )}

      {isSchedulesOpen && (
        <div className="px-4 py-5 sm:px-6">
          <ScheduledCallsPanel
            projectId={projectId}
            endpoint={ep}
            canWrite={canWrite}
            schedulerAvailable={scheduler.available}
            schedulerMessage={scheduler.message}
          />
        </div>
      )}
    </div>
  );
}
