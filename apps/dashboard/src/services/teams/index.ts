import httpClient from '@/http-client';
import type {
  TeamResponse,
  ProjectInvite,
  Membership,
  PendingInvite,
  Team as WorkspaceTeam,
} from '@/types';
import type {
  InviteMemberInput,
  UpdateRoleInput,
  CreateTeamInput,
  UpdateTeamInput,
} from '@/schema/teams';

/* ----------------------------------------------------------------- */
/* Legacy per-project team (will be removed in Week 7)                */
/* ----------------------------------------------------------------- */

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

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { data } = await httpClient.get<PendingInvite[]>('/api/invites/pending');
  return data;
}

/* ----------------------------------------------------------------- */
/* Workspace teams (Week 6+)                                          */
/* ----------------------------------------------------------------- */

export async function getWorkspaceTeamsInCompany(companyId: string): Promise<WorkspaceTeam[]> {
  const { data } = await httpClient.get<WorkspaceTeam[]>(`/api/companies/${companyId}/teams`);
  return data;
}

export async function getWorkspaceTeam(id: string): Promise<WorkspaceTeam> {
  const { data } = await httpClient.get<WorkspaceTeam>(`/api/teams/${id}`);
  return data;
}

export async function createWorkspaceTeam(
  companyId: string,
  body: CreateTeamInput
): Promise<WorkspaceTeam> {
  const { data } = await httpClient.post<WorkspaceTeam>(`/api/companies/${companyId}/teams`, body);
  return data;
}

export async function updateWorkspaceTeam(
  id: string,
  body: UpdateTeamInput
): Promise<WorkspaceTeam> {
  const { data } = await httpClient.put<WorkspaceTeam>(`/api/teams/${id}`, body);
  return data;
}

export async function deleteWorkspaceTeam(id: string): Promise<void> {
  await httpClient.delete(`/api/teams/${id}`);
}
