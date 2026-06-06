'use client';

import { useState } from 'react';
import {
  useScenarios,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useActivateScenario,
  useDeactivateAllScenarios,
} from '@/query/scenarios';
import { ScenarioForm } from './scenario-form';
import { RulesEditor } from './rules-editor';
import { useConfirm } from '@/providers/ConfirmProvider';
import type { Scenario, ScenarioInput } from '@/types';

type Props = {
  endpointId: string;
  canWrite: boolean;
};

function OverrideChips({ s }: { s: Scenario }) {
  const chips: string[] = [];
  if (s.statusCode != null) chips.push(`status ${s.statusCode}`);
  if (s.responseBody != null) chips.push('body');
  if (s.responseHeaders != null) chips.push('headers');
  if (s.delayMs != null) {
    chips.push(
      s.delayMaxMs != null ? `delay ${s.delayMs}-${s.delayMaxMs}ms` : `delay ${s.delayMs}ms`
    );
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function ScenariosManager({ endpointId, canWrite }: Props) {
  const { data: scenarios = [], isLoading } = useScenarios(endpointId);

  const {
    mutate: createScenario,
    isPending: creating,
    error: createError,
  } = useCreateScenario(endpointId);
  const { mutate: deleteScenario } = useDeleteScenario(endpointId);
  const { mutate: activateScenario, isPending: activating } = useActivateScenario(endpointId);
  const { mutate: deactivateAll, isPending: deactivating } = useDeactivateAllScenarios(endpointId);
  const confirm = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rulesOpenId, setRulesOpenId] = useState<string | null>(null);

  const activeScenario = scenarios.find((s) => s.isActive) ?? null;

  function handleCreate(data: ScenarioInput) {
    createScenario(data, { onSuccess: () => setShowCreate(false) });
  }

  if (isLoading) {
    return <div className="text-xs text-muted-foreground text-center py-4">Loading scenarios…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Active state header */}
      <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 border">
        <div className="text-xs">
          <span className="text-muted-foreground">Currently active: </span>
          {activeScenario ? (
            <span className="font-semibold text-primary">{activeScenario.name}</span>
          ) : (
            <span className="font-semibold text-foreground">Default (endpoint response)</span>
          )}
        </div>
        {canWrite && activeScenario && (
          <button
            onClick={() => deactivateAll()}
            disabled={deactivating}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {deactivating ? 'Clearing…' : 'Use default'}
          </button>
        )}
      </div>

      {/* Scenarios list */}
      {scenarios.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-4">
          No scenarios yet — endpoint always returns the default response.
        </div>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => (
            <div key={s.id}>
              <div
                className={`bg-card border rounded-lg px-3 py-2.5 flex items-center gap-3 ${
                  editingId === s.id || rulesOpenId === s.id ? 'rounded-b-none border-b-0' : ''
                } ${s.isActive ? 'border-ring' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-medium text-foreground">{s.name}</span>
                    {s.isActive && (
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                    {s.priority !== 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        priority {s.priority}
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mb-1.5 truncate">{s.description}</p>
                  )}
                  <OverrideChips s={s} />
                </div>

                <button
                  onClick={() => {
                    setShowCreate(false);
                    setEditingId(null);
                    setRulesOpenId((prev) => (prev === s.id ? null : s.id));
                  }}
                  className={`text-xs font-medium shrink-0 transition-colors ${
                    rulesOpenId === s.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {rulesOpenId === s.id ? 'Close rules' : 'Rules'}
                </button>

                {canWrite && (
                  <>
                    {!s.isActive && (
                      <button
                        onClick={() => activateScenario(s.id)}
                        disabled={activating}
                        className="text-xs font-medium text-primary hover:text-primary disabled:opacity-50 shrink-0"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setRulesOpenId(null);
                        setEditingId((prev) => (prev === s.id ? null : s.id));
                      }}
                      className={`text-xs font-medium shrink-0 transition-colors ${
                        editingId === s.id
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      {editingId === s.id ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete scenario?',
                          description: `"${s.name}" will be permanently removed.`,
                          confirmText: 'Delete',
                          destructive: true,
                        });
                        if (ok) deleteScenario(s.id);
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {editingId === s.id && canWrite && (
                <ScenarioEditWrapper
                  scenario={s}
                  endpointId={endpointId}
                  onClose={() => setEditingId(null)}
                />
              )}

              {rulesOpenId === s.id && (
                <div className="bg-card border border-t-0 rounded-b-lg px-4 py-3">
                  <RulesEditor scenarioId={s.id} canWrite={canWrite} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form / button */}
      {canWrite && (
        <>
          {showCreate ? (
            <div className="bg-card border rounded-lg p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3">New scenario</h4>
              <ScenarioForm
                mode="create"
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                isPending={creating}
                error={createError as Error | null}
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingId(null);
                setShowCreate(true);
              }}
              className="w-full px-3 py-2 border border-dashed border-input rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-input transition-colors"
            >
              + New scenario
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Small wrapper to scope the update mutation per scenario
function ScenarioEditWrapper({
  scenario,
  endpointId,
  onClose,
}: {
  scenario: Scenario;
  endpointId: string;
  onClose: () => void;
}) {
  const { mutate: updateScenario, isPending, error } = useUpdateScenario(scenario.id, endpointId);

  return (
    <div className="bg-card border border-t-0 rounded-b-lg px-4 py-3">
      <ScenarioForm
        mode="edit"
        initialValues={scenario}
        onSubmit={(data) => updateScenario(data, { onSuccess: onClose })}
        onCancel={onClose}
        isPending={isPending}
        error={error as Error | null}
      />
    </div>
  );
}
