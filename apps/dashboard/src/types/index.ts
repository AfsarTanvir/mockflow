export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type AuthResponse = {
  message: string;
  user: User;
  token: string;
};
