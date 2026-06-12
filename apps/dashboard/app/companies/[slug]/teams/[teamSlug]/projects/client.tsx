'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, FolderGit2 } from 'lucide-react';

import { useMyCompanies } from '@/query/companies';
import { useWorkspaceTeams } from '@/query/teams';
import { useTeamMembers } from '@/query/team-memberships';
import { useTeamProjects, useCreateTeamProject, useDeleteTeamProject } from '@/query/projects';
import { createProjectSchema, type CreateProjectInput } from '@/schema/projects';
import { TeamSubnav } from '@/components/dashboard/team-subnav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/providers/ConfirmProvider';

export default function TeamProjectsClient({ slug, teamSlug }: { slug: string; teamSlug: string }) {
  const { data: memberships = [] } = useMyCompanies();
  const me = memberships.find((m) => m.company.slug === slug);
  const companyId = me?.company.id ?? '';
  const myProfileId = me?.profile.id;
  const companyRole = me?.profile.role;

  const { data: teams = [] } = useWorkspaceTeams(companyId);
  const team = teams.find((t) => t.slug === teamSlug);
  const teamId = team?.id ?? '';

  const { data: members = [] } = useTeamMembers(teamId);
  const { data: projects = [], isLoading } = useTeamProjects(teamId);

  const {
    mutate: createProject,
    isPending: creating,
    error: createError,
  } = useCreateTeamProject(teamId);
  const { mutate: deleteProject } = useDeleteTeamProject(teamId);
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);

  // Create/delete is allowed for company owner/admin or a team admin.
  const isCompanyAdmin = companyRole === 'owner' || companyRole === 'admin';
  const isTeamAdmin = members.find((mm) => mm.profileId === myProfileId)?.role === 'admin';
  const canManage = isCompanyAdmin || isTeamAdmin;

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

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      <Link
        href={`/companies/${slug}/teams`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Teams
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-base font-semibold">
          {team?.name ?? 'Team'}{' '}
          <span className="text-muted-foreground font-normal">· projects</span>
        </h1>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Project'}
          </Button>
        )}
      </div>

      <TeamSubnav slug={slug} teamSlug={teamSlug} />

      {showForm && canManage && (
        <Card>
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
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description={
            canManage ? 'Create the first project for this team.' : 'This team has no projects yet.'
          }
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex-row items-center justify-between p-5">
              <Link
                href={`/companies/${slug}/teams/${teamSlug}/projects/${project.id}`}
                className="group min-w-0 flex-1"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground group-hover:text-primary text-sm font-semibold transition-colors">
                    {project.name}
                  </h3>
                  {project.isPublic && <Badge variant="success">Public</Badge>}
                </div>
                <p className="text-muted-foreground font-mono text-xs">/{project.slug}</p>
              </Link>
              {canManage && (
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
          ))}
        </div>
      )}
    </main>
  );
}
