'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@/query/auth';
import { useProject } from '@/query/projects';
import {
  useEndpoints,
  useCreateEndpoint,
  useDeleteEndpoint,
  useToggleEndpoint,
} from '@/query/endpoints';
import { createEndpointSchema, type CreateEndpointInput } from '@/schema/endpoints';
import type { User, Project, HttpMethod } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = [200, 201, 204, 400, 401, 403, 404, 409, 422, 500];

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
  const { mutate: deleteEndpoint } = useDeleteEndpoint(initialProject.id);
  const { mutate: toggleEndpoint } = useToggleEndpoint(initialProject.id);

  const [showForm, setShowForm] = useState(false);
  const [responseBodyText, setResponseBodyText] = useState('{\n  \n}');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEndpointInput>({
    resolver: zodResolver(createEndpointSchema),
    defaultValues: { method: 'GET', statusCode: 200, delayMs: 0, isActive: true },
  });

  const currentProject = project ?? initialProject;

  function parseBody(text: string): Record<string, unknown> | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function onSubmit(data: CreateEndpointInput) {
    createEndpoint(
      { ...data, responseBody: parseBody(responseBodyText) },
      {
        onSuccess: () => {
          reset();
          setResponseBodyText('{\n  \n}');
          setShowForm(false);
        },
      }
    );
  }

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto mt-8 px-6">
      {/* Project info bar */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 mb-1">{currentProject.name}</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">Mock base URL</p>
            <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {API_URL}/mock/{currentProject.slug}
            </code>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
        >
          {showForm ? 'Cancel' : '+ New Endpoint'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Endpoint</h3>

          {createError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {createError.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="flex gap-3">
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  {...register('method')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
                <input
                  type="text"
                  {...register('path')}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.path ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="/users/:id"
                />
                {errors.path && <p className="mt-1 text-xs text-red-500">{errors.path.message}</p>}
              </div>

              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  {...register('statusCode')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-28">
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay (ms)</label>
                <input
                  type="number"
                  {...register('delayMs')}
                  min={0}
                  max={5000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Response Body (JSON)
              </label>
              <textarea
                value={responseBodyText}
                onChange={(e) => setResponseBodyText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder={'{\n  "message": "Hello"\n}'}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating…' : 'Create Endpoint'}
            </button>
          </form>
        </div>
      )}

      {/* Endpoint list */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Endpoints ({endpoints.length})
        </h2>

        {isLoading ? (
          <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
        ) : endpoints.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No endpoints yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Add your first endpoint
            </button>
          </div>
        ) : (
          endpoints.map((ep) => (
            <div
              key={ep.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${!ep.isActive ? 'opacity-50' : ''}`}
            >
              <span
                className={`text-xs font-bold px-2 py-1 rounded font-mono shrink-0 ${METHOD_COLORS[ep.method]}`}
              >
                {ep.method}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-900 truncate">{ep.path}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate font-mono">
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
                className={`text-xs px-2 py-1 rounded-full shrink-0 transition-colors ${ep.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {ep.isActive ? 'Active' : 'Inactive'}
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
          ))
        )}
      </div>
    </main>
  );
}
