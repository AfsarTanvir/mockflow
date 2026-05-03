'use client';

import { useState } from 'react';
import { Clock, RotateCcw, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import { useVersions, useCreateVersion, useRestoreVersion, useVersion } from '@/query/versions';
import type { TeamRole } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_RANK: Record<TeamRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SnapshotPreview({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) {
  const { data, isLoading } = useVersion(projectId, versionId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading snapshot…
      </div>
    );
  }

  if (!data) return null;

  const { snapshot } = data;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Snapshot — {snapshot.endpoints.length} endpoint{snapshot.endpoints.length !== 1 ? 's' : ''}
      </p>
      {snapshot.endpoints.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No endpoints in this snapshot</p>
      ) : (
        <div className="space-y-1">
          {snapshot.endpoints.map((ep, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0',
                  ep.method === 'GET' && 'bg-blue-100 text-blue-700',
                  ep.method === 'POST' && 'bg-green-100 text-green-700',
                  ep.method === 'PUT' && 'bg-yellow-100 text-yellow-700',
                  ep.method === 'PATCH' && 'bg-orange-100 text-orange-700',
                  ep.method === 'DELETE' && 'bg-red-100 text-red-700'
                )}
              >
                {ep.method}
              </span>
              <span className="text-xs font-mono text-gray-600 truncate">{ep.path}</span>
              <span className="text-xs text-gray-400 shrink-0">{ep.statusCode}</span>
              {!ep.isActive && (
                <span className="text-[10px] text-gray-400 shrink-0">inactive</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type VersionPanelProps = {
  projectId: string;
  currentUserRole: TeamRole;
};

export function VersionPanel({ projectId, currentUserRole }: VersionPanelProps) {
  const canManage = ROLE_RANK[currentUserRole] >= ROLE_RANK['admin'];

  const { data: versions = [], isLoading } = useVersions(projectId);
  const { mutate: createVersion, isPending: saving } = useCreateVersion(projectId);
  const { mutate: restoreVersion, isPending: restoring } = useRestoreVersion(projectId);

  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleSave() {
    createVersion(message.trim() || null, {
      onSuccess: () => setMessage(''),
    });
  }

  function handleRestore(versionId: string, label: string) {
    if (confirm(`Restore to "${label}"? This will replace all current endpoints.`)) {
      restoreVersion(versionId);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400 text-center py-12">Loading history…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Save snapshot form — admin/owner only */}
      {canManage && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Save current state</h3>
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Optional description (e.g. before refactor)"
              maxLength={500}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save snapshot
            </button>
          </div>
        </div>
      )}

      {/* Version list */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          History ({versions.length})
        </h3>

        {versions.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No snapshots yet.</p>
            {canManage && (
              <p className="text-xs text-gray-400 mt-1">
                Save a snapshot to record the current state of your project.
              </p>
            )}
          </div>
        ) : (
          versions.map((v) => {
            const label = v.message ?? `Snapshot ${new Date(v.createdAt).toLocaleDateString()}`;
            const isExpanded = expandedId === v.id;

            return (
              <div key={v.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-300 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {timeAgo(v.createdAt)}
                      {v.createdBy && (
                        <span className="ml-1">by {v.createdBy.name}</span>
                      )}
                      <span className="ml-2 text-gray-300">·</span>
                      <span className="ml-2">{v.endpointCount} endpoint{v.endpointCount !== 1 ? 's' : ''}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && (
                      <button
                        onClick={() => handleRestore(v.id, label)}
                        disabled={restoring}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                        title="Restore to this version"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Preview snapshot'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <SnapshotPreview projectId={projectId} versionId={v.id} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
