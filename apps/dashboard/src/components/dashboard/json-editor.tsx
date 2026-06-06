'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-[#1e1e1e] rounded-lg"
      style={{ height: 240 }}
    >
      <span className="text-xs text-muted-foreground">Loading editor…</span>
    </div>
  ),
});

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  readOnly?: boolean;
};

function isValidJson(str: string): boolean {
  if (!str.trim()) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function JsonEditor({ value, onChange, height = 240, readOnly = false }: JsonEditorProps) {
  const valid = useMemo(() => isValidJson(value), [value]);

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-input">
        <MonacoEditor
          height={height}
          language="json"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly,
            padding: { top: 8, bottom: 8 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: 'none',
          }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${valid ? 'text-success' : 'text-destructive'}`}>
        {valid ? '✓ Valid JSON' : '✗ Invalid JSON'}
      </p>
    </div>
  );
}
