import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProfilesInCompany,
  getMyProfile,
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  changeProfileRole,
  suspendProfile,
  reactivateProfile,
  leaveProfile,
  removeProfile,
  type UpdateProfileBody,
} from '@/services/profiles';
import { QueryKey } from '@/types/query-key.enum';
import type { ProfileRole } from '@/types';

export const useProfilesInCompany = (companyId: string) => {
  return useQuery({
    queryKey: [QueryKey.PROFILES_IN_COMPANY, companyId],
    queryFn: () => getProfilesInCompany(companyId),
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
};

export const useMyProfile = (companyId: string) => {
  return useQuery({
    queryKey: [QueryKey.MY_PROFILE, companyId],
    queryFn: () => getMyProfile(companyId),
    enabled: !!companyId,
    staleTime: 60 * 1000,
  });
};

export const useProfile = (id: string) => {
  return useQuery({
    queryKey: [QueryKey.PROFILE, id],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });
};

function invalidateProfileCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
  profileId?: string
) {
  queryClient.invalidateQueries({ queryKey: [QueryKey.PROFILES_IN_COMPANY, companyId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.MY_PROFILE, companyId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
  if (profileId) queryClient.invalidateQueries({ queryKey: [QueryKey.PROFILE, profileId] });
}

export const useUpdateProfile = (id: string, companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(id, body),
    onSuccess: () => invalidateProfileCaches(queryClient, companyId, id),
  });
};

export const useUploadProfileAvatar = (id: string, companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadProfileAvatar(id, file),
    onSuccess: () => invalidateProfileCaches(queryClient, companyId, id),
  });
};

export const useChangeProfileRole = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Exclude<ProfileRole, 'owner'> }) =>
      changeProfileRole(id, role),
    onSuccess: (_, vars) => invalidateProfileCaches(queryClient, companyId, vars.id),
  });
};

export const useSuspendProfile = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suspendProfile(id),
    onSuccess: (_, id) => invalidateProfileCaches(queryClient, companyId, id),
  });
};

export const useReactivateProfile = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateProfile(id),
    onSuccess: (_, id) => invalidateProfileCaches(queryClient, companyId, id),
  });
};

export const useLeaveProfile = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveProfile(id),
    onSuccess: (_, id) => invalidateProfileCaches(queryClient, companyId, id),
  });
};

export const useRemoveProfile = (companyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeProfile(id),
    onSuccess: (_, id) => invalidateProfileCaches(queryClient, companyId, id),
  });
};
