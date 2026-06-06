'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

type Row = { id: string; key: string; value: string };

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function recordToRows(record: Record<string, string>): Row[] {
  const entries = Object.entries(record);
  if (entries.length === 0) return [];
  return entries.map(([key, value]) => ({ id: makeId(), key, value }));
}

function rowsToRecord(rows: Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.key.trim()) out[row.key.trim()] = row.value;
  }
  return out;
}

type HeadersEditorProps = {
  value: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
};

export function HeadersEditor({ value, onChange }: HeadersEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => recordToRows(value));

  useEffect(() => {
    setRows(recordToRows(value));
  }, []); // only on mount — internal state owns the rows after that

  function update(next: Row[]) {
    setRows(next);
    onChange(rowsToRecord(next));
  }

  function addRow() {
    update([...rows, { id: makeId(), key: '', value: '' }]);
  }

  function removeRow(id: string) {
    update(rows.filter((r) => r.id !== id));
  }

  function setKey(id: string, key: string) {
    update(rows.map((r) => (r.id === id ? { ...r, key } : r)));
  }

  function setValue(id: string, value: string) {
    update(rows.map((r) => (r.id === id ? { ...r, value } : r)));
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No custom headers</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="flex gap-2 items-center">
            <input
              type="text"
              value={row.key}
              onChange={(e) => setKey(row.id, e.target.value)}
              placeholder="Header name"
              className="w-44 px-2 py-1.5 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) => setValue(row.id, e.target.value)}
              placeholder="Value"
              className="flex-1 px-2 py-1.5 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Add header
      </button>
    </div>
  );
}
