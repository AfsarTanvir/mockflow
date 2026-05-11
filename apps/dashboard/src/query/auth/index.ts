import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getAuthUser, signIn, signOut, signUp, updateProfile, verifyEmail, resendVerification, forgotPassword, resetPassword } from '@/services/auth';
import { QueryKey } from '@/types/query-key.enum';
import type { User } from '@/types';

const TOKEN_KEY = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export const useUser = (options?: { initialData?: User }) => {
  return useQuery({
    queryKey: [QueryKey.AUTH_USER],
    queryFn: getAuthUser,
    initialData: options?.initialData,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

export const useSignIn = (redirectTo = '/dashboard') => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: signIn,
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData([QueryKey.AUTH_USER], data.user);
      router.push(redirectTo);
    },
  });
};

export const useSignUp = (redirectTo = '/dashboard') => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: signUp,
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData([QueryKey.AUTH_USER], data.user);
      router.push(redirectTo);
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: verifyEmail,
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: resendVerification,
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      resetPassword(token, newPassword),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData([QueryKey.AUTH_USER], updated);
    },
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      clearToken();
      queryClient.clear();
      router.replace('/auth/login');
    },
  });
};
