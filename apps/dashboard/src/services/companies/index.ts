import httpClient from '@/http-client';
import type { Company, CompanyLanding, MyCompanyMembership } from '@/types';
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
  TransferOwnershipInput,
} from '@/schema/companies';

export async function getMyCompanies(): Promise<MyCompanyMembership[]> {
  const { data } = await httpClient.get<MyCompanyMembership[]>('/api/companies');
  return data;
}

/**
 * Returns either Company (full member view) or CompanyLanding (anonymous view)
 * depending on whether the requester has an active profile in the company.
 * Caller can distinguish by checking the presence of `currentUserRole`.
 */
export async function getCompany(slug: string): Promise<Company | CompanyLanding> {
  const { data } = await httpClient.get<Company | CompanyLanding>(`/api/companies/${slug}`);
  return data;
}

export async function createCompany(body: CreateCompanyInput): Promise<{
  company: { id: string; name: string; slug: string };
  profile: { id: string; role: string };
}> {
  const { data } = await httpClient.post('/api/companies', body);
  return data;
}

export async function updateCompany(id: string, body: UpdateCompanyInput): Promise<Company> {
  const { data } = await httpClient.put<Company>(`/api/companies/${id}`, body);
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  await httpClient.delete(`/api/companies/${id}`);
}

export async function transferOwnership(id: string, body: TransferOwnershipInput): Promise<void> {
  await httpClient.post(`/api/companies/${id}/transfer-ownership`, body);
}

/** Upload an image as the company logo/avatar (multipart, owner/admin only). */
export async function uploadCompanyAvatar(id: string, file: File): Promise<Company> {
  const form = new FormData();
  form.append('avatar', file);
  const { data } = await httpClient.post<Company>(`/api/companies/${id}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
