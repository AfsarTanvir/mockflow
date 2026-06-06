import httpClient from '@/http-client';
import type { UpdateCompanyInput, TransferOwnershipInput } from '@/schema/companies';
import type {
  AdminCompany,
  AdminEndpoint,
  AdminEndpointListParams,
  AdminListParams,
  AdminProfile,
  AdminProfileListParams,
  AdminProject,
  AdminRequestLog,
  AdminRequestLogListParams,
  AdminTeam,
  AdminUser,
  ImpersonationResult,
  Paginated,
  PlatformStats,
} from '@/types/admin';
import type { ProfileRole, ProfileStatus } from '@/types';

/**
 * Platform-admin (master agency) API client. Every list endpoint is paginated
 * and accepts `{ page, perPage, search, sort, dir, ...filters }` as query params
 * (axios omits `undefined` values). All routes are gated server-side by the
 * `superAdmin` middleware.
 */

export async function getStats(): Promise<PlatformStats> {
  const { data } = await httpClient.get<PlatformStats>('/api/admin/stats');
  return data;
}

export async function getUsers(params: AdminListParams): Promise<Paginated<AdminUser>> {
  const { data } = await httpClient.get<Paginated<AdminUser>>('/api/admin/users', { params });
  return data;
}

export async function getCompanies(params: AdminListParams): Promise<Paginated<AdminCompany>> {
  const { data } = await httpClient.get<Paginated<AdminCompany>>('/api/admin/companies', {
    params,
  });
  return data;
}

export async function getProfiles(
  params: AdminProfileListParams
): Promise<Paginated<AdminProfile>> {
  const { data } = await httpClient.get<Paginated<AdminProfile>>('/api/admin/profiles', { params });
  return data;
}

export async function getTeams(params: AdminListParams): Promise<Paginated<AdminTeam>> {
  const { data } = await httpClient.get<Paginated<AdminTeam>>('/api/admin/teams', { params });
  return data;
}

export async function getProjects(params: AdminListParams): Promise<Paginated<AdminProject>> {
  const { data } = await httpClient.get<Paginated<AdminProject>>('/api/admin/projects', { params });
  return data;
}

export async function getEndpoints(
  params: AdminEndpointListParams
): Promise<Paginated<AdminEndpoint>> {
  const { data } = await httpClient.get<Paginated<AdminEndpoint>>('/api/admin/endpoints', {
    params,
  });
  return data;
}

export async function getRequestLogs(
  params: AdminRequestLogListParams
): Promise<Paginated<AdminRequestLog>> {
  const { data } = await httpClient.get<Paginated<AdminRequestLog>>('/api/admin/request-logs', {
    params,
  });
  return data;
}

/* ---- company management ---- */
export async function updateCompany(id: string, body: UpdateCompanyInput): Promise<AdminCompany> {
  const { data } = await httpClient.put<AdminCompany>(`/api/admin/companies/${id}`, body);
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  await httpClient.delete(`/api/admin/companies/${id}`);
}

export async function transferOwnership(id: string, body: TransferOwnershipInput): Promise<void> {
  await httpClient.post(`/api/admin/companies/${id}/transfer-ownership`, body);
}

/* ---- profile management ---- */
export async function suspendProfile(id: string): Promise<{ id: string; status: ProfileStatus }> {
  const { data } = await httpClient.post(`/api/admin/profiles/${id}/suspend`);
  return data;
}

export async function reactivateProfile(
  id: string
): Promise<{ id: string; status: ProfileStatus }> {
  const { data } = await httpClient.post(`/api/admin/profiles/${id}/reactivate`);
  return data;
}

export async function deleteProfile(id: string): Promise<{ id: string; status: ProfileStatus }> {
  const { data } = await httpClient.delete(`/api/admin/profiles/${id}`);
  return data;
}

export async function changeProfileRole(
  id: string,
  role: Exclude<ProfileRole, 'owner'>
): Promise<AdminProfile> {
  const { data } = await httpClient.patch<AdminProfile>(`/api/admin/profiles/${id}/role`, { role });
  return data;
}

/* ---- impersonation ---- */
export async function impersonate(userId: string): Promise<ImpersonationResult> {
  const { data } = await httpClient.post<ImpersonationResult>(`/api/admin/impersonate/${userId}`);
  return data;
}
