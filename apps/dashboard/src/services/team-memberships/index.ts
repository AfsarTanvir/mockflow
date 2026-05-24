import httpClient from '@/http-client';
import type { TeamMembership, WorkspaceTeamRole } from '@/types';

export async function getTeamMembers(teamId: string): Promise<TeamMembership[]> {
  const { data } = await httpClient.get<TeamMembership[]>(`/api/teams/${teamId}/members`);
  return data;
}

export async function addTeamMember(
  teamId: string,
  body: { profileId: string; role?: WorkspaceTeamRole }
): Promise<TeamMembership> {
  const { data } = await httpClient.post<TeamMembership>(`/api/teams/${teamId}/members`, body);
  return data;
}

export async function changeTeamMemberRole(
  teamId: string,
  profileId: string,
  role: WorkspaceTeamRole
): Promise<TeamMembership> {
  const { data } = await httpClient.patch<TeamMembership>(
    `/api/teams/${teamId}/members/${profileId}`,
    { role }
  );
  return data;
}

export async function removeTeamMember(teamId: string, profileId: string): Promise<void> {
  await httpClient.delete(`/api/teams/${teamId}/members/${profileId}`);
}
