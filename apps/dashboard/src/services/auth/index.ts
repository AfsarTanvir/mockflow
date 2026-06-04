import httpClient from '@/http-client';
import type { AuthResponse, User } from '@/types';
import type { LoginInput, RegisterInput } from '@/schema/auth';

export async function getAuthUser(): Promise<User> {
  const { data } = await httpClient.get<User>('/api/auth/me');
  return data;
}

export async function signIn(body: LoginInput): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>('/api/auth/login', body);
  return data;
}

export async function signUp(body: Omit<RegisterInput, 'confirmPassword'>): Promise<AuthResponse> {
  const { data } = await httpClient.post<AuthResponse>('/api/auth/register', body);
  return data;
}

export async function signOut(): Promise<void> {
  await httpClient.post('/api/auth/logout', {});
}

export async function updateProfile(body: {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<User> {
  const { data } = await httpClient.patch<User>('/api/auth/profile', body);
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await httpClient.post(`/api/auth/verify/${token}`);
  return data;
}

export async function resendVerification(): Promise<{ message: string }> {
  const { data } = await httpClient.post('/api/auth/resend-verification');
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await httpClient.post('/api/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await httpClient.post(`/api/auth/reset-password/${token}`, { newPassword });
  return data;
}
