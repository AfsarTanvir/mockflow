'use client';

import { useRequestLogs } from '@/query/logs';
import type { Project } from '@/types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-primary/10 text-primary',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

function statusColor(code: number) {
  if (code < 300) return 'text-green-600';
  if (code < 400) return 'text-yellow-600';
  return 'text-red-500';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  project: Project;
}

export function LogsPanel({ project }: Props) {
  const { data: logs = [], isLoading } = useRequestLogs(project.id);

  if (!project.settings.log_requests) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <p className="text-sm text-gray-400 mb-2">Request logging is disabled for this project.</p>
        <p className="text-xs text-gray-400">
          Enable <span className="font-medium text-gray-600">Log requests</span> in the Settings tab
          to start recording mock hits.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400 text-center py-12">Loading…</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <p className="text-sm text-gray-400">No requests logged yet.</p>
        <p className="text-xs text-gray-400 mt-1">Hit a mock endpoint to see it appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Last {logs.length} requests
        </h2>
      </div>
      <div className="divide-y">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_COLORS[log.method] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {log.method}
            </span>

            <p className="flex-1 text-sm font-mono text-gray-800 truncate">{log.path}</p>

            <span className={`text-xs font-medium shrink-0 ${statusColor(log.statusCode)}`}>
              {log.statusCode}
            </span>

            <span className="text-xs text-gray-400 shrink-0 w-14 text-right">{log.duration}ms</span>

            <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
              {timeAgo(log.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
