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
import { EndpointList } from '@/components/dashboard/endpoint-list';
import { TeamPanel } from '@/components/dashboard/team-panel';
import { VersionPanel } from '@/components/dashboard/version-panel';
import { ProjectSettingsPanel } from '@/components/dashboard/project-settings-panel';
import { LogsPanel } from '@/components/dashboard/logs-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useTeam } from '@/query/teams';
import type { User, Project, Endpoint } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

const TABS = ['endpoints', 'team', 'history', 'logs', 'settings'] as const;
type ActiveTab = (typeof TABS)[number];

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

  const { data: team } = useTeam(initialProject.id);
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<ActiveTab>('endpoints');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scenariosOpenId, setScenariosOpenId] = useState<string | null>(null);

  const currentProject = project ?? initialProject;
  const currentUserRole = team?.currentUserRole ?? initialProject.userRole ?? 'viewer';
  const canWrite = currentUserRole !== 'viewer';
  const mockBaseUrl = `${API_URL}/mock/${currentProject.slug}`;

  function handleCreate(data: EndpointFormPayload) {
    createEndpoint(data, { onSuccess: () => setShowCreateForm(false) });
  }

  function handleUpdate(id: string, data: EndpointFormPayload) {
    updateEndpoint({ id, ...data }, { onSuccess: () => setEditingId(null) });
  }

  function handleEditClick(id: string) {
    setShowCreateForm(false);
    setScenariosOpenId(null);
    setEditingId((prev) => (prev === id ? null : id));
  }

  function handleScenariosClick(id: string) {
    setShowCreateForm(false);
    setEditingId(null);
    setScenariosOpenId((prev) => (prev === id ? null : id));
  }

  async function handleDelete(endpoint: Endpoint) {
    const ok = await confirm({
      title: 'Delete endpoint?',
      description: `${endpoint.method} ${endpoint.path} will be permanently removed.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) deleteEndpoint(endpoint.id);
  }

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    setShowCreateForm(false);
    setEditingId(null);
    setScenariosOpenId(null);
  }

  if (!user) return null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Project info bar */}
      <div className="bg-card mb-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-foreground mb-1 text-base font-semibold">{currentProject.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Mock base URL</span>
            <code className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs break-all">
              {mockBaseUrl}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUserRole === 'viewer' && <Badge variant="muted">Read-only</Badge>}
          {activeTab === 'endpoints' && canWrite && (
            <Button
              onClick={() => {
                setEditingId(null);
                setShowCreateForm((v) => !v);
              }}
            >
              {showCreateForm ? 'Cancel' : '+ New Endpoint'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="bg-muted inline-flex w-max gap-1 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'endpoints' && (
        <>
          {showCreateForm && canWrite && (
            <div className="bg-card mb-6 rounded-xl border p-5 sm:p-6">
              <h3 className="text-foreground mb-5 text-sm font-semibold">New Endpoint</h3>
              <EndpointForm
                mode="create"
                onSubmit={handleCreate}
                onCancel={() => setShowCreateForm(false)}
                isPending={creating}
                error={createError}
              />
            </div>
          )}

          <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Endpoints ({endpoints.length})
          </h2>

          <EndpointList
            endpoints={endpoints}
            isLoading={isLoading}
            canWrite={canWrite}
            mockBaseUrl={mockBaseUrl}
            editingId={editingId}
            scenariosOpenId={scenariosOpenId}
            isUpdating={updating}
            updateError={updateError}
            onToggle={toggleEndpoint}
            onEditClick={handleEditClick}
            onScenariosClick={handleScenariosClick}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onCreateFirst={() => setShowCreateForm(true)}
          />
        </>
      )}

      {activeTab === 'team' && <TeamPanel projectId={currentProject.id} currentUserId={user.id} />}

      {activeTab === 'history' && (
        <VersionPanel projectId={currentProject.id} currentUserRole={currentUserRole} />
      )}

      {activeTab === 'logs' && <LogsPanel project={currentProject} />}

      {activeTab === 'settings' && (
        <ProjectSettingsPanel project={currentProject} currentUserRole={currentUserRole} />
      )}
    </main>
  );
}
