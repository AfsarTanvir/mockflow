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
