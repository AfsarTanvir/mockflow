'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useUser } from '@/query/auth';
import { useProjects, useCreateProject, useDeleteProject } from '@/query/projects';
import { createProjectSchema, type CreateProjectInput } from '@/schema/projects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/providers/ConfirmProvider';
import type { User } from '@/types';

export default function ProjectsClient({ initialUser }: { initialUser: User }) {
  const { data: user } = useUser({ initialData: initialUser });
  const { data: projects = [], isLoading } = useProjects();
  const { mutate: createProject, isPending: creating, error: createError } = useCreateProject();
  const { mutate: deleteProject } = useDeleteProject();
  const confirm = useConfirm();
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
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-foreground text-lg font-semibold">Projects</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Project</CardTitle>
          </CardHeader>
          <CardContent>
            {createError && (
              <div className="bg-destructive/10 text-destructive mb-4 rounded-lg px-3 py-2 text-sm">
                {createError.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="My API"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="basePath">Base Path</Label>
                <Input
                  id="basePath"
                  type="text"
                  placeholder="/"
                  aria-invalid={!!errors.basePath}
                  {...register('basePath')}
                />
                {errors.basePath && (
                  <p className="text-destructive text-xs">{errors.basePath.message}</p>
                )}
              </div>

              <Label htmlFor="isPublic" className="font-normal">
                <input
                  type="checkbox"
                  id="isPublic"
                  {...register('isPublic')}
                  className="border-input accent-primary size-4 rounded"
                />
                Make project public
              </Label>

              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Project'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-sm">No projects yet</p>
          <Button variant="link" className="mt-2" onClick={() => setShowForm(true)}>
            Create your first project
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const isOwner = !project.userRole || project.userRole === 'owner';
            return (
              <Card key={project.id} className="flex-row items-center justify-between p-5">
                <Link href={`/dashboard/projects/${project.id}`} className="group min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-foreground group-hover:text-primary text-sm font-semibold transition-colors">
                      {project.name}
                    </h3>
                    {project.isPublic && <Badge variant="success">Public</Badge>}
                    {project.userRole && project.userRole !== 'owner' && (
                      <Badge variant="muted" className="capitalize">
                        {project.userRole}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">/{project.slug}</p>
                </Link>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive ml-4 shrink-0"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete project?',
                        description: `"${project.name}" and all its endpoints will be permanently removed.`,
                        confirmText: 'Delete',
                        destructive: true,
                      });
                      if (ok) deleteProject(project.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
