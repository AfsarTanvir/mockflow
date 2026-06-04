'use client';

import { useState } from 'react';
import {
  exportOpenApiRaw,
  exportOpenApiEvaluated,
  exportPostmanRaw,
  exportPostmanEvaluated,
} from '@/services/export';

interface Props {
  projectId: string;
}

type ExportKey = 'openapi-raw' | 'openapi-eval' | 'postman-raw' | 'postman-eval';

export function ExportPanel({ projectId }: Props) {
  const [loading, setLoading] = useState<ExportKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger(key: ExportKey, fn: () => Promise<void>) {
    setLoading(key);
    setError(null);
    try {
      await fn();
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  const rows: {
    label: string;
    rawKey: ExportKey;
    evalKey: ExportKey;
    rawFn: () => Promise<void>;
    evalFn: () => Promise<void>;
  }[] = [
    {
      label: 'OpenAPI 3.0',
      rawKey: 'openapi-raw',
      evalKey: 'openapi-eval',
      rawFn: () => exportOpenApiRaw(projectId),
      evalFn: () => exportOpenApiEvaluated(projectId),
    },
    {
      label: 'Postman v2.1',
      rawKey: 'postman-raw',
      evalKey: 'postman-eval',
      rawFn: () => exportPostmanRaw(projectId),
      evalFn: () => exportPostmanEvaluated(projectId),
    },
  ];

  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Export</h2>
      <p className="text-xs text-gray-400">
        Download your project as a standard API spec file.{' '}
        <span className="text-gray-500 font-medium">Raw</span> keeps faker templates as-is;{' '}
        <span className="text-gray-500 font-medium">Evaluated</span> replaces them with sample
        values.
      </p>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">{row.label}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => trigger(row.rawKey, row.rawFn)}
                className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading === row.rawKey ? 'Downloading…' : 'Raw'}
              </button>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => trigger(row.evalKey, row.evalFn)}
                className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading === row.evalKey ? 'Downloading…' : 'Evaluated'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
