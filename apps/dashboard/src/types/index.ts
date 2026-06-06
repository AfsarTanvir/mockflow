export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  /** Present on `/auth/me`; true when the user is a platform super-admin. */
  isSuperAdmin?: boolean;
};

/* ------------------------------------------------------------------ */
/* Workspace model (companies + profiles)                              */
/* ------------------------------------------------------------------ */

export type CompanyVisibility = 'private' | 'protected' | 'public';
export type ProfileRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProfileStatus = 'active' | 'suspended' | 'inactive';
export type ProfileVisibility = 'public' | 'company_member_only';
export type CompanySizeBucket = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';

export type CompanySettings = {
  locale?: string;
  timezone?: string;
  members_can_create_teams?: boolean;
  members_can_create_projects?: boolean;
};

export type BillingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
};

/** Landing view — what unauthenticated visitors see for protected/public companies. */
export type CompanyLanding = {
  id: string;
  name: string;
  slug: string;
  visibility: CompanyVisibility;
  logoUrl: string | null;
  avatarUrl: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  sizeBucket: CompanySizeBucket | null;
  totalMember: number;
  totalTeam: number;
  createdAt: string;
};

/** Full member view — returned to active members of the company. */
export type Company = CompanyLanding & {
  billingEmail: string | null;
  billingAddress: BillingAddress | null;
  settings: CompanySettings;
  ownerUserId: string;
  updatedAt: string;
  currentUserRole: ProfileRole;
  currentProfileId: string;
};

/** Each entry returned by GET /api/companies — company + the requester's profile in it. */
export type MyCompanyMembership = {
  company: Pick<CompanyLanding, 'id' | 'name' | 'slug' | 'visibility' | 'logoUrl' | 'avatarUrl'>;
  profile: {
    id: string;
    role: ProfileRole;
    displayName: string;
    avatarUrl: string | null;
    status: ProfileStatus;
  };
};

export type ProfileLink = { label: string; url: string };

export type ProfilePreferences = {
  notifications?: { email?: boolean; in_app?: boolean };
  locale?: string;
  timezone?: string;
};

/** Full profile view — returned to self + members of the same company. */
export type Profile = {
  id: string;
  userId: string;
  companyId: string;
  displayName: string;
  avatarUrl: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  visibility: ProfileVisibility;
  joinedAt: string | null;
  leftAt: string | null;
  jobTitle: string | null;
  department: string | null;
  phone: string | null;
  bio: string | null;
  links: ProfileLink[];
  preferences: ProfilePreferences;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Safe card view — what anonymous visitors see for `visibility='public'` profiles. */
export type ProfilePublicCard = {
  id: string;
  companyId: string;
  displayName: string;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
  jobTitle: string | null;
  department: string | null;
  bio: string | null;
  links: ProfileLink[];
};

/* ------------------------------------------------------------------ */
/* Teams                                                               */
/* ------------------------------------------------------------------ */

export type TeamVisibility = 'private' | 'company_member_only' | 'public';
/** Role within a workspace team. Note: distinct from the legacy per-project `TeamRole`. */
export type WorkspaceTeamRole = 'admin' | 'member';

export type TeamExternalLink = { label: string; url: string };

export type TeamSettings = {
  notify_on_member_add?: boolean;
  notify_on_member_remove?: boolean;
};

export type Team = {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: TeamVisibility;
  avatarUrl: string | null;
  color: string | null;
  externalLinks: TeamExternalLink[];
  settings: TeamSettings;
  totalMember: number;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamMembership = {
  id: string;
  teamId: string;
  profileId: string;
  role: WorkspaceTeamRole;
  joinedAt: string;
  profile?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    companyRole: ProfileRole;
    status: ProfileStatus;
  };
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
  delayMaxMs: number | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSettings = {
  cors: boolean;
  log_requests: boolean;
  global_headers?: Record<string, string>;
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

export type RequestLog = {
  id: string;
  projectId: string;
  endpointId: string | null;
  method: HttpMethod;
  path: string;
  statusCode: number;
  duration: number;
  createdAt: string;
};

export type Scenario = {
  id: string;
  endpointId: string;
  name: string;
  description: string | null;
  statusCode: number | null;
  responseBody: Record<string, unknown> | null;
  responseHeaders: Record<string, string> | null;
  delayMs: number | null;
  delayMaxMs: number | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type ScenarioInput = {
  name: string;
  description?: string | null;
  statusCode?: number | null;
  responseBody?: Record<string, unknown> | null;
  responseHeaders?: Record<string, string> | null;
  delayMs?: number | null;
  delayMaxMs?: number | null;
  priority?: number;
};

export type RuleSource = 'header' | 'query' | 'body';
export type RuleOperator = 'equals' | 'exists';

export type ScenarioRule = {
  id: string;
  scenarioId: string;
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value: string | null;
  createdAt: string;
};

export type ScenarioRuleInput = {
  source: RuleSource;
  field: string;
  operator: RuleOperator;
  value?: string | null;
};
