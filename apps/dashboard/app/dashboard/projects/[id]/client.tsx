'use client';

import { useState } from 'react';
import { useUser } from '@/query/auth';
import { useProject } from '@/query/projects';
import {
  useEndpoints,
  useCreateEndpoint,
  useUpdateEndpoint,
  useDeleteEndpoint,
  useToggleEndpoint,
} from '@/query/endpoints';
import { EndpointForm, type EndpointFormPayload } from '@/components/dashboard/endpoint-form';
import { TeamPanel } from '@/components/dashboard/team-panel';
import type { User, Project, HttpMethod } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

type ActiveTab = 'endpoints' | 'team';

export default function ProjectDetailClient({
  initialUser,
  initialProject,
}: {
  initialUser: User;
  initialProject: Project;
}) {
  const { data: user } = useUser({ initialData: initialUser });
  const { data: project } = useProject(initialProject.id);
  const { data: endpoints = [], isLoading } = useEndpoints(initialProject.id);

  const {
    mutate: createEndpoint,
    isPending: creating,
    error: createError,
  } = useCreateEndpoint(initialProject.id);
  const {
    mutate: updateEndpoint,
    isPending: updating,
    error: updateError,
  } = useUpdateEndpoint(initialProject.id);
  const { mutate: deleteEndpoint } = useDeleteEndpoint(initialProject.id);
  const { mutate: toggleEndpoint } = useToggleEndpoint(initialProject.id);

  const [activeTab, setActiveTab] = useState<ActiveTab>('endpoints');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const currentProject = project ?? initialProject;

  function handleCreate(data: EndpointFormPayload) {
    createEndpoint(data, { onSuccess: () => setShowCreateForm(false) });
  }

  function handleUpdate(id: string, data: EndpointFormPayload) {
    updateEndpoint({ id, ...data }, { onSuccess: () => setEditingId(null) });
  }

  function handleEditClick(id: string) {
    setShowCreateForm(false);
    setEditingId((prev) => (prev === id ? null : id));
  }

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    setShowCreateForm(false);
    setEditingId(null);
  }

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto mt-8 px-6 pb-12">
      {/* Project info bar */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 mb-1">{currentProject.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Mock base URL</span>
            <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {API_URL}/mock/{currentProject.slug}
            </code>
          </div>
        </div>
        {activeTab === 'endpoints' && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowCreateForm((v) => !v);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
          >
            {showCreateForm ? 'Cancel' : '+ New Endpoint'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['endpoints', 'team'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Endpoints tab */}
      {activeTab === 'endpoints' && (
        <>
          {showCreateForm && (
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-5">New Endpoint</h3>
              <EndpointForm
                mode="create"
                onSubmit={handleCreate}
                onCancel={() => setShowCreateForm(false)}
                isPending={creating}
                error={createError}
              />
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Endpoints ({endpoints.length})
            </h2>

            {isLoading ? (
              <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
            ) : endpoints.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No endpoints yet</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  Add your first endpoint
                </button>
              </div>
            ) : (
              endpoints.map((ep) => (
                <div key={ep.id}>
                  <div
                    className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                      !ep.isActive ? 'opacity-50' : ''
                    } ${editingId === ep.id ? 'rounded-b-none border-b-0' : ''}`}
                  >
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded font-mono shrink-0 ${METHOD_COLORS[ep.method]}`}
                    >
                      {ep.method}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-900 truncate">{ep.path}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                        {API_URL}/mock/{currentProject.slug}
                        {ep.path}
                      </p>
                    </div>

                    <span className="text-xs text-gray-500 shrink-0">{ep.statusCode}</span>
                    {ep.delayMs > 0 && (
                      <span className="text-xs text-gray-400 shrink-0">{ep.delayMs}ms</span>
                    )}

                    <button
                      onClick={() => toggleEndpoint(ep.id)}
                      className={`text-xs px-2 py-1 rounded-full shrink-0 transition-colors ${
                        ep.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {ep.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => handleEditClick(ep.id)}
                      className={`text-xs font-medium shrink-0 transition-colors ${
                        editingId === ep.id ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
                      }`}
                    >
                      {editingId === ep.id ? 'Close' : 'Edit'}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete ${ep.method} ${ep.path}?`)) deleteEndpoint(ep.id);
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      Delete
                    </button>
                  </div>

                  {editingId === ep.id && (
                    <div className="bg-white border border-t-0 rounded-b-xl px-6 py-5">
                      <EndpointForm
                        mode="edit"
                        initialValues={ep}
                        onSubmit={(data) => handleUpdate(ep.id, data)}
                        onCancel={() => setEditingId(null)}
                        isPending={updating}
                        error={updateError}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Team tab */}
      {activeTab === 'team' && <TeamPanel projectId={currentProject.id} currentUserId={user.id} />}
    </main>
  );
}
