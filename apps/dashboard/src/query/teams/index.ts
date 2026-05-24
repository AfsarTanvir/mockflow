import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTeam,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvite,
  getMyMemberships,
  acceptInvite,
  getPendingInvites,
  getWorkspaceTeamsInCompany,
  getWorkspaceTeam,
  createWorkspaceTeam,
  updateWorkspaceTeam,
  deleteWorkspaceTeam,
} from '@/services/teams';
import { QueryKey } from '@/types/query-key.enum';
import type { TeamResponse, PendingInvite } from '@/types';
import type {
  InviteMemberInput,
  UpdateRoleInput,
  CreateTeamInput,
  UpdateTeamInput,
} from '@/schema/teams';

export const useTeam = (projectId: string) => {
  return useQuery({
    queryKey: [QueryKey.TEAM_MEMBERS, projectId],
    queryFn: () => getTeam(projectId),
    staleTime: 60 * 1000,
    enabled: !!projectId,
  });
};

export const useInviteMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteMemberInput) => inviteMember(projectId, body),
    onSuccess: ({ invite }) => {
      queryClient.setQueryData<TeamResponse>([QueryKey.TEAM_MEMBERS, projectId], (old) => {
        if (!old) return old;
        return { ...old, invites: [invite, ...old.invites] };
      });
    },
  });
};

export const useUpdateMemberRole = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, body }: { memberId: string; body: UpdateRoleInput }) =>
      updateMemberRole(projectId, memberId, body),
    onSuccess: (_, { memberId, body }) => {
      queryClient.setQueryData<TeamResponse>([QueryKey.TEAM_MEMBERS, projectId], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.map((m) => (m.id === memberId ? { ...m, role: body.role } : m)),
        };
      });
    },
  });
};

export const useRemoveMember = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(projectId, memberId),
    onSuccess: (_, memberId) => {
      queryClient.setQueryData<TeamResponse>([QueryKey.TEAM_MEMBERS, projectId], (old) => {
        if (!old) return old;
        return { ...old, members: old.members.filter((m) => m.id !== memberId) };
      });
    },
  });
};

export const useRevokeInvite = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(projectId, inviteId),
    onSuccess: (_, inviteId) => {
      queryClient.setQueryData<TeamResponse>([QueryKey.TEAM_MEMBERS, projectId], (old) => {
        if (!old) return old;
        return { ...old, invites: old.invites.filter((i) => i.id !== inviteId) };
      });
    },
  });
};

export const useMyMemberships = () => {
  return useQuery({
    queryKey: [QueryKey.MY_MEMBERSHIPS],
    queryFn: getMyMemberships,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: (_, token) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_MEMBERSHIPS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECTS] });
      // Remove the accepted invite from the bell immediately
      queryClient.setQueryData<PendingInvite[]>([QueryKey.PENDING_INVITES], (old) =>
        old ? old.filter((i) => i.token !== token) : []
      );
    },
  });
};

export const usePendingInvites = () => {
  return useQuery({
    queryKey: [QueryKey.PENDING_INVITES],
    queryFn: getPendingInvites,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};

/* ----------------------------------------------------------------- */
/* Workspace teams (Week 6+)                                          */
/* ----------------------------------------------------------------- */

export const useWorkspaceTeams = (companyId: string) => {
  return useQuery({
    queryKey: [QueryKey.TEAMS_IN_COMPANY, companyId],
    queryFn: () => getWorkspaceTeamsInCompany(companyId),
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
};

export const useWorkspaceTeam = (id: string) => {
  return useQuery({
    queryKey: [QueryKey.WORKSPACE_TEAM, id],
    queryFn: () => getWorkspaceTeam(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

export const useCreateWorkspaceTeam = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateTeamInput) => createWorkspaceTeam(companyId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY, companyId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
    },
  });
};

export const useUpdateWorkspaceTeam = (id: string, companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateTeamInput) => updateWorkspaceTeam(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.WORKSPACE_TEAM, id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY, companyId] });
    },
  });
};

export const useDeleteWorkspaceTeam = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkspaceTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY, companyId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
    },
  });
};
