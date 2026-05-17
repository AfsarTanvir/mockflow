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
    chips.push(s.delayMaxMs != null ? `delay ${s.delayMs}-${s.delayMaxMs}ms` : `delay ${s.delayMs}ms`);
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function ScenariosManager({ endpointId, canWrite }: Props) {
  const { data: scenarios = [], isLoading } = useScenarios(endpointId);

  const { mutate: createScenario, isPending: creating, error: createError } = useCreateScenario(endpointId);
  const { mutate: deleteScenario } = useDeleteScenario(endpointId);
  const { mutate: activateScenario, isPending: activating } = useActivateScenario(endpointId);
  const { mutate: deactivateAll, isPending: deactivating } = useDeactivateAllScenarios(endpointId);

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeScenario = scenarios.find((s) => s.isActive) ?? null;

  function handleCreate(data: ScenarioInput) {
    createScenario(data, { onSuccess: () => setShowCreate(false) });
  }

  if (isLoading) {
    return <div className="text-xs text-gray-400 text-center py-4">Loading scenarios…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Active state header */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border">
        <div className="text-xs">
          <span className="text-gray-400">Currently active: </span>
          {activeScenario ? (
            <span className="font-semibold text-blue-700">{activeScenario.name}</span>
          ) : (
            <span className="font-semibold text-gray-700">Default (endpoint response)</span>
          )}
        </div>
        {canWrite && activeScenario && (
          <button
            onClick={() => deactivateAll()}
            disabled={deactivating}
            className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            {deactivating ? 'Clearing…' : 'Use default'}
          </button>
        )}
      </div>

      {/* Scenarios list */}
      {scenarios.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-4">
          No scenarios yet — endpoint always returns the default response.
        </div>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => (
            <div key={s.id}>
              <div
                className={`bg-white border rounded-lg px-3 py-2.5 flex items-center gap-3 ${
                  editingId === s.id ? 'rounded-b-none border-b-0' : ''
                } ${s.isActive ? 'border-blue-300' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-medium text-gray-900">{s.name}</span>
                    {s.isActive && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                    {s.priority !== 0 && (
                      <span className="text-[10px] text-gray-400">priority {s.priority}</span>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-xs text-gray-500 mb-1.5 truncate">{s.description}</p>
                  )}
                  <OverrideChips s={s} />
                </div>

                {canWrite && (
                  <>
                    {!s.isActive && (
                      <button
                        onClick={() => activateScenario(s.id)}
                        disabled={activating}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 shrink-0"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setEditingId((prev) => (prev === s.id ? null : s.id));
                      }}
                      className={`text-xs font-medium shrink-0 transition-colors ${
                        editingId === s.id ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
                      }`}
                    >
                      {editingId === s.id ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete scenario "${s.name}"?`)) deleteScenario(s.id);
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
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
            </div>
          ))}
        </div>
      )}

      {/* Create form / button */}
      {canWrite && (
        <>
          {showCreate ? (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">New scenario</h4>
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
              className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
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
    <div className="bg-white border border-t-0 rounded-b-lg px-4 py-3">
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
