import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeProfileRole,
  deleteCompany,
  deleteProfile,
  getCompanies,
  getEndpoints,
  getProfiles,
  getProjects,
  getRequestLogs,
  getStats,
  getTeams,
  getUsers,
  impersonate,
  reactivateProfile,
  suspendProfile,
  transferOwnership,
  updateCompany,
} from '@/services/admin';
import { QueryKey } from '@/types/query-key.enum';
import type { UpdateCompanyInput } from '@/schema/companies';
import type {
  AdminEndpointListParams,
  AdminListParams,
  AdminProfileListParams,
  AdminRequestLogListParams,
} from '@/types/admin';
import type { ProfileRole } from '@/types';

const LIST_STALE_TIME = 30 * 1000;

/* ------------------------------- reads ------------------------------- */
export const useAdminStats = () =>
  useQuery({ queryKey: [QueryKey.ADMIN_STATS], queryFn: getStats, staleTime: LIST_STALE_TIME });

export const useAdminUsers = (params: AdminListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_USERS, params],
    queryFn: () => getUsers(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminCompanies = (params: AdminListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_COMPANIES, params],
    queryFn: () => getCompanies(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminProfiles = (params: AdminProfileListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_PROFILES, params],
    queryFn: () => getProfiles(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminTeams = (params: AdminListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_TEAMS, params],
    queryFn: () => getTeams(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminProjects = (params: AdminListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_PROJECTS, params],
    queryFn: () => getProjects(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminEndpoints = (params: AdminEndpointListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_ENDPOINTS, params],
    queryFn: () => getEndpoints(params),
    staleTime: LIST_STALE_TIME,
  });

export const useAdminRequestLogs = (params: AdminRequestLogListParams) =>
  useQuery({
    queryKey: [QueryKey.ADMIN_REQUEST_LOGS, params],
    queryFn: () => getRequestLogs(params),
    staleTime: LIST_STALE_TIME,
  });

/* ---------------------------- mutations ------------------------------ */
export const useAdminUpdateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCompanyInput }) => updateCompany(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_COMPANIES] }),
  });
};

export const useAdminDeleteCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_COMPANIES] });
      qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_STATS] });
    },
  });
};

export const useAdminTransferOwnership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newOwnerProfileId }: { id: string; newOwnerProfileId: string }) =>
      transferOwnership(id, { newOwnerProfileId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_COMPANIES] });
      qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_PROFILES] });
    },
  });
};

export const useAdminSuspendProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suspendProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_PROFILES] }),
  });
};

export const useAdminReactivateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_PROFILES] }),
  });
};

export const useAdminDeleteProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_PROFILES] }),
  });
};

export const useAdminChangeProfileRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Exclude<ProfileRole, 'owner'> }) =>
      changeProfileRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QueryKey.ADMIN_PROFILES] }),
  });
};

export const useAdminImpersonate = () =>
  useMutation({ mutationFn: (userId: string) => impersonate(userId) });
