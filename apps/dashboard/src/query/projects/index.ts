import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getTeamProjects,
  createTeamProject,
  getCompanyProjects,
} from '@/services/projects';
import { QueryKey } from '@/types/query-key.enum';
import type { Project } from '@/types';
import type { CreateProjectInput, UpdateProjectInput } from '@/schema/projects';

export const useProjects = () => {
  return useQuery({
    queryKey: [QueryKey.PROJECTS],
    queryFn: getProjects,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: [QueryKey.PROJECT, id],
    queryFn: () => getProject(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProjectInput) => createProject(body),
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>([QueryKey.PROJECTS], (old = []) => [newProject, ...old]);
    },
  });
};

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProjectInput) => updateProject(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData([QueryKey.PROJECT, id], updated);
      queryClient.setQueryData<Project[]>([QueryKey.PROJECTS], (old = []) =>
        old.map((p) => (p.id === id ? updated : p))
      );
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Project[]>([QueryKey.PROJECTS], (old = []) =>
        old.filter((p) => p.id !== id)
      );
      queryClient.removeQueries({ queryKey: [QueryKey.PROJECT, id] });
    },
  });
};

/* ----------------------------------------------------------------- */
/* Team-owned projects                                               */
/* ----------------------------------------------------------------- */

export const useTeamProjects = (teamId: string) => {
  return useQuery({
    queryKey: [QueryKey.TEAM_PROJECTS, teamId],
    queryFn: () => getTeamProjects(teamId),
    enabled: !!teamId,
    staleTime: 30 * 1000,
  });
};

export const useCompanyProjects = (companyId: string) => {
  return useQuery({
    queryKey: [QueryKey.COMPANY_PROJECTS, companyId],
    queryFn: () => getCompanyProjects(companyId),
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
};

export const useCreateTeamProject = (teamId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProjectInput) => createTeamProject(teamId, body),
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>([QueryKey.TEAM_PROJECTS, teamId], (old = []) => [
        newProject,
        ...old,
      ]);
      // Refresh team cards (total_project) and the company-wide list.
      queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COMPANY_PROJECTS] });
    },
  });
};

export const useDeleteTeamProject = (teamId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Project[]>([QueryKey.TEAM_PROJECTS, teamId], (old = []) =>
        old.filter((p) => p.id !== id)
      );
      queryClient.removeQueries({ queryKey: [QueryKey.PROJECT, id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COMPANY_PROJECTS] });
    },
  });
};
