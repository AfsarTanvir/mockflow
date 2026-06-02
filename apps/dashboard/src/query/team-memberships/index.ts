import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTeamMembers,
  addTeamMember,
  changeTeamMemberRole,
  removeTeamMember,
} from '@/services/team-memberships';
import { QueryKey } from '@/types/query-key.enum';
import type { WorkspaceTeamRole } from '@/types';

export const useTeamMembers = (teamId: string) => {
  return useQuery({
    queryKey: [QueryKey.WORKSPACE_TEAM_MEMBERS, teamId],
    queryFn: () => getTeamMembers(teamId),
    enabled: !!teamId,
    staleTime: 30 * 1000,
  });
};

function invalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  teamId: string,
  companyId?: string
) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.WORKSPACE_TEAM_MEMBERS, teamId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.WORKSPACE_TEAM, teamId] });
  if (companyId)
    queryClient.invalidateQueries({ queryKey: [QueryKey.TEAMS_IN_COMPANY, companyId] });
}

export const useAddTeamMember = (teamId: string, companyId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { profileId: string; role?: WorkspaceTeamRole }) =>
      addTeamMember(teamId, body),
    onSuccess: () => invalidate(queryClient, teamId, companyId),
  });
};

export const useChangeTeamMemberRole = (teamId: string, companyId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: WorkspaceTeamRole }) =>
      changeTeamMemberRole(teamId, profileId, role),
    onSuccess: () => invalidate(queryClient, teamId, companyId),
  });
};

export const useRemoveTeamMember = (teamId: string, companyId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => removeTeamMember(teamId, profileId),
    onSuccess: () => invalidate(queryClient, teamId, companyId),
  });
};
