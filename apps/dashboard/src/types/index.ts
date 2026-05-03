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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Endpoint = {
  id: string;
  projectId: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSettings = {
  cors: boolean;
  log_requests: boolean;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  basePath: string;
  ownerId: string;
  isPublic: boolean;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
};
