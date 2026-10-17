import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Endpoint } from '@/types';
import { EndpointRow, type SchedulerAvailability } from './endpoint-row';
import type { EndpointFormPayload } from './endpoint-form';

interface EndpointListProps {
  endpoints: Endpoint[];
  projectId: string;
  isLoading: boolean;
  canWrite: boolean;
  mockBaseUrl: string;
  editingId: string | null;
  scenariosOpenId: string | null;
  schedulesOpenId: string | null;
  scheduler: SchedulerAvailability;
  isUpdating: boolean;
  updateError?: Error | null;
  onToggle: (id: string) => void;
  onEditClick: (id: string) => void;
  onScenariosClick: (id: string) => void;
  onSchedulesClick: (id: string) => void;
  onDelete: (endpoint: Endpoint) => void;
  onUpdate: (id: string, data: EndpointFormPayload) => void;
  onCreateFirst: () => void;
}

export function EndpointList({
  endpoints,
  projectId,
  isLoading,
  canWrite,
  mockBaseUrl,
  editingId,
  scenariosOpenId,
  schedulesOpenId,
  scheduler,
  isUpdating,
  updateError,
  onToggle,
  onEditClick,
  onScenariosClick,
  onSchedulesClick,
  onDelete,
  onUpdate,
  onCreateFirst,
}: EndpointListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-12 text-center">
        <p className="text-muted-foreground text-sm">No endpoints yet</p>
        {canWrite && (
          <Button variant="link" className="mt-2" onClick={onCreateFirst}>
            Add your first endpoint
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {endpoints.map((ep) => (
        <EndpointRow
          key={ep.id}
          endpoint={ep}
          projectId={projectId}
          mockBaseUrl={mockBaseUrl}
          canWrite={canWrite}
          isEditing={editingId === ep.id}
          isScenariosOpen={scenariosOpenId === ep.id}
          isSchedulesOpen={schedulesOpenId === ep.id}
          scheduler={scheduler}
          isUpdating={isUpdating}
          updateError={updateError}
          onToggle={onToggle}
          onEditClick={onEditClick}
          onScenariosClick={onScenariosClick}
          onSchedulesClick={onSchedulesClick}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
