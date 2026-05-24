import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  transferOwnership,
} from '@/services/companies';
import { QueryKey } from '@/types/query-key.enum';
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
  TransferOwnershipInput,
} from '@/schema/companies';

export const useMyCompanies = () => {
  return useQuery({
    queryKey: [QueryKey.MY_COMPANIES],
    queryFn: getMyCompanies,
    staleTime: 60 * 1000,
  });
};

export const useCompany = (slug: string) => {
  return useQuery({
    queryKey: [QueryKey.COMPANY, slug],
    queryFn: () => getCompany(slug),
    enabled: !!slug,
    staleTime: 60 * 1000,
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCompanyInput) => createCompany(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
    },
  });
};

export const useUpdateCompany = (id: string, slug?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateCompanyInput) => updateCompany(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
      if (slug) queryClient.invalidateQueries({ queryKey: [QueryKey.COMPANY, slug] });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
    },
  });
};

export const useTransferOwnership = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TransferOwnershipInput) => transferOwnership(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MY_COMPANIES] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.COMPANY] });
    },
  });
};
