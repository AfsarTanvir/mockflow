import httpClient from '@/http-client';
import type { TeamResponse, ProjectInvite, Membership } from '@/types';
import type { InviteMemberInput, UpdateRoleInput } from '@/schema/teams';

export async function getTeam(projectId: string): Promise<TeamResponse> {
  const { data } = await httpClient.get<TeamResponse>(`/api/projects/${projectId}/team`);
  return data;
}

export async function inviteMember(
  projectId: string,
  body: InviteMemberInput
): Promise<{ invite: ProjectInvite }> {
  const { data } = await httpClient.post<{ invite: ProjectInvite }>(
    `/api/projects/${projectId}/team/invite`,
    body
  );
  return data;
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  body: UpdateRoleInput
): Promise<void> {
  await httpClient.put(`/api/projects/${projectId}/team/${memberId}/role`, body);
}

export async function removeMember(projectId: string, memberId: string): Promise<void> {
  await httpClient.delete(`/api/projects/${projectId}/team/${memberId}`);
}

export async function revokeInvite(projectId: string, inviteId: string): Promise<void> {
  await httpClient.delete(`/api/projects/${projectId}/invites/${inviteId}`);
}

export async function getMyMemberships(): Promise<Membership[]> {
  const { data } = await httpClient.get<Membership[]>('/api/team');
  return data;
}

export async function acceptInvite(token: string): Promise<{ projectId: string }> {
  const { data } = await httpClient.post<{ projectId: string }>(`/api/invites/${token}/accept`);
  return data;
}
