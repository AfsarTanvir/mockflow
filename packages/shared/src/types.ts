// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  slug: string;
  base_path: string;
  owner_id: string;
  is_public: boolean;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  cors: boolean;
  log_requests: boolean;
  [key: string]: any;
}

// Endpoint types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface Endpoint {
  id: string;
  project_id: string;
  method: HttpMethod;
  path: string;
  status_code: number;
  response_body: Record<string, any>;
  response_headers: Record<string, string>;
  delay_ms: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Team member types
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: TeamRole;
  user?: User;
  invited_at: string;
}

// Version history types
export interface VersionSnapshot {
  id: string;
  project_id: string;
  snapshot: Record<string, any>;
  message?: string;
  created_by: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

// Mock execution types
export interface MockExecutionRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

export interface MockExecutionResponse {
  status_code: number;
  body: Record<string, any>;
  headers: Record<string, string>;
  delay_ms: number;
}
