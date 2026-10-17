'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useConfirm } from '@/providers/ConfirmProvider';
import {
  useScheduledCalls,
  useScheduledCallRuns,
  useCreateScheduledCall,
  useDeleteScheduledCall,
  usePauseScheduledCall,
  useResumeScheduledCall,
  useRunScheduledCall,
} from '@/query/scheduled-calls';
import type { Endpoint, ScheduledCall, ScheduleMode } from '@/types';
import { HeadersEditor } from './headers-editor';

type Props = {
  projectId: string;
  endpoint: Endpoint;
  /** The project's mock URL prefix, base path included. */
  mockBaseUrl: string;
  canWrite: boolean;
  schedulerAvailable: boolean;
  schedulerMessage: string;
};

const UNITS = [
  { value: 60, label: 'minutes' },
  { value: 3600, label: 'hours' },
  { value: 86_400, label: 'days' },
] as const;

const MIN_INTERVAL_SECONDS = 60;
const MAX_INTERVAL_SECONDS = 30 * 86_400;

function describeInterval(seconds: number): string {
  for (const unit of [...UNITS].reverse()) {
    if (seconds % unit.value === 0) {
      const n = seconds / unit.value;
      return `Every ${n} ${n === 1 ? unit.label.slice(0, -1) : unit.label}`;
    }
  }
  return `Every ${seconds} seconds`;
}

/** `datetime-local` value for a Date, in the browser's time zone. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Where a one-time call stands. `done`: the scheduler has used up its run (it
 * clears nextRunAt when the run starts). `missed`: paused until after its time;
 * resuming it would fire it at once, so only Run now / Delete are offered.
 */
function onceState(call: ScheduledCall): 'done' | 'missed' | null {
  if (call.mode !== 'once') return null;
  if (call.sync === 'ok' && call.live && !call.live.running && !call.live.nextRunAt) return 'done';
  if (!call.isActive && call.runAt && new Date(call.runAt).getTime() <= Date.now()) return 'missed';
  return null;
}

function StateBadge({ call }: { call: ScheduledCall }) {
  if (call.sync === 'missing') return <Badge variant="destructive">Missing in scheduler</Badge>;
  if (call.sync === 'unknown') return <Badge variant="muted">Status unknown</Badge>;
  if (call.live?.running) return <Badge variant="info">Running</Badge>;
  const once = onceState(call);
  if (once === 'done') return <Badge variant="muted">Done</Badge>;
  if (once === 'missed') return <Badge variant="warning">Missed</Badge>;
  if (!call.isActive) return <Badge variant="muted">Paused</Badge>;
  return <Badge variant="success">Scheduled</Badge>;
}

/* ------------------------------------------------------------------ */

function CreateScheduleForm({
  projectId,
  endpoint,
  mockBaseUrl,
  disabled,
  onDone,
}: {
  projectId: string;
  endpoint: Endpoint;
  mockBaseUrl: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const { mutate, isPending, error } = useCreateScheduledCall(projectId);
  const [path, setPath] = useState(endpoint.path);
  const [mode, setMode] = useState<ScheduleMode>('repeat');
  const [runAt, setRunAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000)));
  const [every, setEvery] = useState('10');
  const [unit, setUnit] = useState<number>(60);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const hasParams = /[:*(]/.test(endpoint.path);
  const allowsBody = endpoint.method !== 'GET';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const request = {
      endpointId: endpoint.id,
      path,
      requestHeaders: headers,
      requestBody: body || undefined,
    };

    if (mode === 'once') {
      const at = new Date(runAt);
      if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
        setFormError('Pick a time in the future.');
        return;
      }
      mutate({ ...request, mode, runAt: at.toISOString() }, { onSuccess: onDone });
      return;
    }

    const intervalSeconds = Math.round(Number(every) * unit);
    if (!Number.isFinite(intervalSeconds) || intervalSeconds < MIN_INTERVAL_SECONDS) {
      setFormError('The interval must be at least 1 minute.');
      return;
    }
    if (intervalSeconds > MAX_INTERVAL_SECONDS) {
      setFormError('The interval can be at most 30 days.');
      return;
    }
    mutate({ ...request, mode, intervalSeconds }, { onSuccess: onDone });
  }

  const message = formError ?? error?.message;

  return (
    <form onSubmit={submit} className="bg-muted/40 space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor={`sc-path-${endpoint.id}`}>Request path</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0 font-mono text-xs">
            {endpoint.method}
          </span>
          <Input
            id={`sc-path-${endpoint.id}`}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="font-mono text-xs"
            required
          />
        </div>
        <p className="text-muted-foreground font-mono text-xs break-all">
          {mockBaseUrl}
          {path}
        </p>
        {hasParams && (
          <p className="text-muted-foreground text-xs">
            Replace the <code className="font-mono">:params</code> in {endpoint.path} with real
            values. A <code className="font-mono">?query</code> is allowed.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>When</Label>
        <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
          {(['repeat', 'once'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                mode === m
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'repeat' ? 'Repeat' : 'Once'}
            </button>
          ))}
        </div>

        {mode === 'repeat' ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Every</span>
            <Input
              type="number"
              min={1}
              step={1}
              value={every}
              onChange={(e) => setEvery(e.target.value)}
              className="w-20"
              aria-label="Interval"
              required
            />
            <select
              value={unit}
              onChange={(e) => setUnit(Number(e.target.value))}
              className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
              aria-label="Interval unit"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">At</span>
            <Input
              type="datetime-local"
              value={runAt}
              min={toLocalInput(new Date())}
              onChange={(e) => setRunAt(e.target.value)}
              className="w-56"
              aria-label="Run at"
              required
            />
            <span className="text-muted-foreground text-xs">your local time</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Headers (optional)</Label>
        <HeadersEditor value={headers} onChange={setHeaders} />
      </div>

      {allowsBody && (
        <div className="space-y-1.5">
          <Label htmlFor={`sc-body-${endpoint.id}`}>Body (optional)</Label>
          <textarea
            id={`sc-body-${endpoint.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder='{"key": "value"}'
            className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs outline-hidden focus-visible:ring-3"
          />
          <p className="text-muted-foreground text-xs">
            Sent as <code className="font-mono">application/json</code> unless you set a
            Content-Type header.
          </p>
        </div>
      )}

      {message && <Alert variant="destructive">{message}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled || isPending}>
          {isPending ? 'Scheduling…' : 'Schedule'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function RunHistory({ callId }: { callId: string }) {
  const { data: runs = [], isLoading, error } = useScheduledCallRuns(callId);

  if (isLoading) return <p className="text-muted-foreground py-2 text-xs">Loading runs…</p>;
  if (error) return <p className="text-destructive py-2 text-xs">{error.message}</p>;
  if (runs.length === 0) return <p className="text-muted-foreground py-2 text-xs">No runs yet.</p>;

  return (
    <ul className="divide-y text-xs">
      {runs.map((run, i) => {
        const ms =
          run.finishedAt && new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
        return (
          <li key={run.id ?? i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <Badge
              variant={
                run.status === 'success'
                  ? 'success'
                  : run.status === 'failed'
                    ? 'destructive'
                    : 'info'
              }
            >
              {run.status}
            </Badge>
            <span className="text-muted-foreground">{formatDateTime(run.startedAt)}</span>
            {typeof ms === 'number' && <span className="text-muted-foreground">{ms} ms</span>}
            <span className="text-foreground min-w-0 flex-1 truncate font-mono">
              {run.error || run.output?.split('\n')[0]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function ScheduledCallsPanel({
  projectId,
  endpoint,
  mockBaseUrl,
  canWrite,
  schedulerAvailable,
  schedulerMessage,
}: Props) {
  const { data: calls = [], isLoading, error } = useScheduledCalls(projectId);
  const remove = useDeleteScheduledCall(projectId);
  const pause = usePauseScheduledCall(projectId);
  const resume = useResumeScheduledCall(projectId);
  const run = useRunScheduledCall(projectId);
  const confirm = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  // The latest action's error only: cleared when the next action starts.
  const [actionError, setActionError] = useState<string | null>(null);

  const mine = calls.filter((c) => c.endpointId === endpoint.id);
  const busy = pause.isPending || resume.isPending || run.isPending || remove.isPending;

  function act(
    mutation: { mutate: (id: string, opts: { onError: (e: Error) => void }) => void },
    id: string
  ) {
    setActionError(null);
    mutation.mutate(id, { onError: (e) => setActionError(e.message) });
  }

  async function handleDelete(call: ScheduledCall) {
    const ok = await confirm({
      title: 'Delete scheduled call?',
      description: `${call.method} ${call.path} will no longer be called.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) act(remove, call.id);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Call this endpoint at a set time, or repeatedly, through the scheduler.
        </p>
        {canWrite && !showCreate && (
          <Button
            size="sm"
            variant="outline"
            disabled={!schedulerAvailable}
            onClick={() => setShowCreate(true)}
          >
            + New schedule
          </Button>
        )}
      </div>

      {!schedulerAvailable && <Alert variant="warning">{schedulerMessage}</Alert>}

      {showCreate && canWrite && (
        <CreateScheduleForm
          projectId={projectId}
          endpoint={endpoint}
          mockBaseUrl={mockBaseUrl}
          disabled={!schedulerAvailable}
          onDone={() => setShowCreate(false)}
        />
      )}

      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {isLoading ? (
        <p className="text-muted-foreground py-4 text-center text-xs">Loading schedules…</p>
      ) : error ? (
        <Alert variant="destructive">{error.message}</Alert>
      ) : mine.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-xs">
          No scheduled calls for this endpoint.
        </p>
      ) : (
        <ul className="space-y-2">
          {mine.map((call) => {
            const lastRun = call.live?.lastRun;
            const canAct = canWrite && schedulerAvailable && call.sync === 'ok' && !busy;
            // A finished or missed one-time call can only be run by hand or deleted.
            const canToggle = onceState(call) === null;
            return (
              <li key={call.id} className="bg-card rounded-lg border">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1 basis-56 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-foreground truncate font-mono text-sm">
                        {call.method} {call.path}
                      </code>
                      <StateBadge call={call} />
                      {!call.matchesEndpoint && (
                        <Badge variant="warning">Doesn&apos;t reach this endpoint</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {call.mode === 'repeat' && call.intervalSeconds
                        ? describeInterval(call.intervalSeconds)
                        : `Once at ${formatDateTime(call.runAt)}`}
                      {call.isActive && call.live?.nextRunAt && (
                        <> · next {formatRelative(call.live.nextRunAt)}</>
                      )}
                    </p>
                    {lastRun && (
                      <p className="text-xs">
                        <span
                          className={cn(
                            'font-medium',
                            lastRun.status === 'success' ? 'text-success' : 'text-destructive'
                          )}
                        >
                          Last run {lastRun.status}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          {formatRelative(lastRun.startedAt)}
                          {lastRun.error ? ` · ${lastRun.error}` : ''}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-active={historyId === call.id ? '' : undefined}
                      className="data-active:text-primary"
                      disabled={call.sync !== 'ok'}
                      onClick={() => setHistoryId((id) => (id === call.id ? null : call.id))}
                    >
                      History
                    </Button>
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canAct}
                          onClick={() => act(run, call.id)}
                        >
                          Run now
                        </Button>
                        {canToggle && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canAct}
                            onClick={() => act(call.isActive ? pause : resume, call.id)}
                          >
                            {call.isActive ? 'Pause' : 'Resume'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={remove.isPending}
                          onClick={() => handleDelete(call)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {historyId === call.id && (
                  <div className="border-t px-3 py-1">
                    <RunHistory callId={call.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
