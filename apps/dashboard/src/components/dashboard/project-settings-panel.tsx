'use client';

import { useState, useEffect } from 'react';
import { useUpdateProject } from '@/query/projects';
import type { Project } from '@/types';

interface Props {
  project: Project;
  currentUserRole: string;
}

export function ProjectSettingsPanel({ project, currentUserRole }: Props) {
  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const [name, setName] = useState(project.name);
  const [basePath, setBasePath] = useState(project.basePath);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [cors, setCors] = useState(project.settings.cors);
  const [logRequests, setLogRequests] = useState(project.settings.log_requests);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(project.name);
    setBasePath(project.basePath);
    setIsPublic(project.isPublic);
    setCors(project.settings.cors);
    setLogRequests(project.settings.log_requests);
    setDirty(false);
  }, [project.id]);

  const { mutate: updateProject, isPending, error, isSuccess } = useUpdateProject(project.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProject(
      { name: name.trim(), basePath: basePath.trim(), isPublic, settings: { cors, log_requests: logRequests } },
      { onSuccess: () => setDirty(false) }
    );
  }

  const nameError = name.trim().length < 2 ? 'Name must be at least 2 characters' : null;
  const basePathError = !basePath.startsWith('/') ? 'Base path must start with /' : null;

  if (!canEdit) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <p className="text-sm text-gray-400 text-center">
          Only admins and owners can edit project settings.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">General</h2>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Project name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); }}
            maxLength={100}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {nameError && dirty && (
            <p className="text-xs text-red-500 mt-1">{nameError}</p>
          )}
        </div>

        {/* Base path */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Base path</label>
          <input
            type="text"
            value={basePath}
            onChange={(e) => { setBasePath(e.target.value); setDirty(true); }}
            maxLength={255}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/"
          />
          {basePathError && dirty && (
            <p className="text-xs text-red-500 mt-1">{basePathError}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Prepended to all mock endpoint paths.
          </p>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">Public project</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Anyone with the mock URL can hit endpoints — no auth required.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setIsPublic((v) => !v); setDirty(true); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              isPublic ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <hr className="border-gray-100" />
        <h2 className="text-sm font-semibold text-gray-900">Advanced</h2>

        {/* CORS toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">CORS</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Add <code className="font-mono">Access-Control-Allow-Origin: *</code> to every mock response.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setCors((v) => !v); setDirty(true); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              cors ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                cors ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Log requests toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">Log requests</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Record every mock hit — view them in the Logs tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setLogRequests((v) => !v); setDirty(true); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              logRequests ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                logRequests ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {error && (
            <p className="text-xs text-red-500">
              {(error as any)?.response?.data?.message ?? 'Failed to save settings'}
            </p>
          )}
          {isSuccess && !dirty && (
            <p className="text-xs text-green-600">Settings saved.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending || !dirty || !!nameError || !!basePathError}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
