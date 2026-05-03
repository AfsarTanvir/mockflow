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
  userRole?: TeamRole;
};

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export type TeamMember = {
  id: string;
  role: TeamRole;
  invitedAt: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

export type ProjectInvite = {
  id: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  token: string;
  createdAt: string;
};

export type TeamResponse = {
  members: TeamMember[];
  invites: ProjectInvite[];
  currentUserRole: TeamRole;
};

export type Membership = {
  id: string;
  role: TeamRole;
  invitedAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
  };
};

export type PendingInvite = {
  token: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
};

export type VersionSnapshot = {
  project: {
    name: string;
    slug: string;
    basePath: string;
    isPublic: boolean;
    settings: { cors: boolean; log_requests: boolean };
  };
  endpoints: Array<{
    method: string;
    path: string;
    statusCode: number;
    responseBody: Record<string, unknown> | null;
    responseHeaders: Record<string, string>;
    delayMs: number;
    isActive: boolean;
  }>;
};

export type ProjectVersion = {
  id: string;
  message: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  endpointCount: number;
};

export type ProjectVersionDetail = ProjectVersion & {
  snapshot: VersionSnapshot;
};
