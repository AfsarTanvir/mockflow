import httpClient from '@/http-client';
import type { Profile, ProfilePublicCard, ProfileRole } from '@/types';

export interface UpdateProfileBody {
  displayName?: string;
  avatarUrl?: string | null;
  visibility?: 'public' | 'company_member_only';
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  bio?: string | null;
  links?: { label: string; url: string }[];
  preferences?: {
    notifications?: { email?: boolean; in_app?: boolean };
    locale?: string;
    timezone?: string;
  };
}

export async function getProfilesInCompany(companyId: string): Promise<Profile[]> {
  const { data } = await httpClient.get<Profile[]>(`/api/companies/${companyId}/profiles`);
  return data;
}

export async function getMyProfile(companyId: string): Promise<Profile> {
  const { data } = await httpClient.get<Profile>(`/api/profiles/me?company=${companyId}`);
  return data;
}

/**
 * Returns Profile (full view) or ProfilePublicCard (safe card) depending on
 * visibility + viewer's membership.
 */
export async function getProfile(id: string): Promise<Profile | ProfilePublicCard> {
  const { data } = await httpClient.get<Profile | ProfilePublicCard>(`/api/profiles/${id}`);
  return data;
}

export async function updateProfile(id: string, body: UpdateProfileBody): Promise<Profile> {
  const { data } = await httpClient.patch<Profile>(`/api/profiles/${id}`, body);
  return data;
}

/** Upload an image file as the profile's avatar (multipart). */
export async function uploadProfileAvatar(id: string, file: File): Promise<Profile> {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await httpClient.post<Profile>(`/api/profiles/${id}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function changeProfileRole(
  id: string,
  role: Exclude<ProfileRole, 'owner'>
): Promise<Profile> {
  const { data } = await httpClient.patch<Profile>(`/api/profiles/${id}/role`, { role });
  return data;
}

export async function suspendProfile(id: string): Promise<{ id: string; status: string }> {
  const { data } = await httpClient.post(`/api/profiles/${id}/suspend`, {});
  return data;
}

export async function reactivateProfile(id: string): Promise<{ id: string; status: string }> {
  const { data } = await httpClient.post(`/api/profiles/${id}/reactivate`, {});
  return data;
}

export async function leaveProfile(
  id: string
): Promise<{ id: string; status: string; leftAt: string | null }> {
  const { data } = await httpClient.post(`/api/profiles/${id}/leave`, {});
  return data;
}

export async function removeProfile(
  id: string
): Promise<{ id: string; status: string; leftAt: string | null }> {
  const { data } = await httpClient.delete(`/api/profiles/${id}`);
  return data;
}
