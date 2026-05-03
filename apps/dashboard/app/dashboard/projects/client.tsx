'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useUser } from '@/query/auth';
import { useProjects, useCreateProject, useDeleteProject } from '@/query/projects';
import { createProjectSchema, type CreateProjectInput } from '@/schema/projects';
import type { User } from '@/types';

export default function ProjectsClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });
  const { data: projects = [], isLoading } = useProjects();
  const { mutate: createProject, isPending: creating, error: createError } = useCreateProject();
  const { mutate: deleteProject } = useDeleteProject();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { basePath: '/', isPublic: false },
  });

  function onSubmit(data: CreateProjectInput) {
    createProject(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  }

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto mt-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Create Project</h3>

          {createError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {createError.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                {...register('name')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="My API"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Path</label>
              <input
                type="text"
                {...register('basePath')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.basePath ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="/"
              />
              {errors.basePath && (
                <p className="mt-1 text-xs text-red-500">{errors.basePath.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                {...register('isPublic')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make project public
              </label>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating…' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-12">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">No projects yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl border p-5 flex items-center justify-between"
            >
              <Link href={`/dashboard/projects/${project.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {project.isPublic && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Public
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono">/{project.slug}</p>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${project.name}"?`)) deleteProject(project.id);
                }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-4 shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
