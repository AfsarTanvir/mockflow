'use client';

import { useState } from 'react';
import { useRules, useCreateRule, useDeleteRule } from '@/query/rules';
import type { RuleOperator, RuleSource, ScenarioRuleInput } from '@/types';

type Props = {
  scenarioId: string;
  canWrite: boolean;
};

const SOURCE_OPTIONS: { value: RuleSource; label: string; hint: string }[] = [
  { value: 'header', label: 'Header', hint: 'e.g. Authorization' },
  { value: 'query', label: 'Query', hint: 'e.g. role' },
  { value: 'body', label: 'Body', hint: 'e.g. user.email' },
];

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'exists', label: 'exists' },
];

export function RulesEditor({ scenarioId, canWrite }: Props) {
  const { data: rules = [], isLoading } = useRules(scenarioId);
  const { mutate: createRule, isPending: creating } = useCreateRule(scenarioId);
  const { mutate: deleteRule } = useDeleteRule(scenarioId);

  const [source, setSource] = useState<RuleSource>('header');
  const [field, setField] = useState('');
  const [operator, setOperator] = useState<RuleOperator>('equals');
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleAdd() {
    setLocalError(null);
    if (!field.trim()) {
      setLocalError('Field is required');
      return;
    }
    if (operator === 'equals' && !value.trim()) {
      setLocalError('Value is required when operator is "equals"');
      return;
    }

    const payload: ScenarioRuleInput = {
      source,
      field: field.trim(),
      operator,
      value: operator === 'exists' ? null : value,
    };

    createRule(payload, {
      onSuccess: () => {
        setField('');
        setValue('');
      },
      onError: (err: unknown) => {
        setLocalError(err instanceof Error ? err.message : 'Failed to add rule');
      },
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        A scenario activates when <span className="font-semibold">all</span> its rules match.
        Scenarios without rules never auto-activate — use the manual switcher.
      </p>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading rules…</div>
      ) : rules.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-2">
          No rules — scenario is manual-only.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_80px_1fr_40px] gap-2 px-3 py-2 bg-muted border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Source</span>
            <span>Field</span>
            <span>Operator</span>
            <span>Value</span>
            <span></span>
          </div>
          {rules.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[80px_1fr_80px_1fr_40px] gap-2 px-3 py-2 border-b last:border-b-0 items-center text-xs"
            >
              <span className="font-mono text-muted-foreground">{r.source}</span>
              <span className="font-mono text-foreground truncate">{r.field}</span>
              <span className="font-mono text-muted-foreground">{r.operator}</span>
              <span className="font-mono text-foreground truncate">{r.value ?? '—'}</span>
              {canWrite ? (
                <button
                  onClick={() => deleteRule(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete rule"
                >
                  ×
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <div className="space-y-2">
          {localError && <p className="text-xs text-destructive">{localError}</p>}
          <div className="grid grid-cols-[80px_1fr_80px_1fr_auto] gap-2 items-center">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as RuleSource)}
              className="px-2 py-1.5 border border-input rounded text-xs"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder={SOURCE_OPTIONS.find((o) => o.value === source)?.hint ?? ''}
              className="px-2 py-1.5 border border-input rounded text-xs font-mono"
            />
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as RuleOperator)}
              className="px-2 py-1.5 border border-input rounded text-xs"
            >
              {OPERATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={operator === 'exists'}
              placeholder={operator === 'exists' ? '(not used)' : 'value'}
              className="px-2 py-1.5 border border-input rounded text-xs font-mono disabled:bg-muted"
            />
            <button
              onClick={handleAdd}
              disabled={creating}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
