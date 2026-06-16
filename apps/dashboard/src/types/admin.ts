import type { PageMeta } from '@/components/ui/pagination';
import type { CompanyVisibility, HttpMethod, ProfileRole, ProfileStatus } from '@/types';

/* ------------------------------------------------------------------ */
/* Platform-admin (master agency) view models                          */
/* Mirror the `*View` mappers in apps/api admin_controller.ts.          */
/* ------------------------------------------------------------------ */

/** Standard paginated envelope returned by every admin list endpoint. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Common list query params accepted by admin list endpoints. */
export interface AdminListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}

type OwnerRef = { id: string; name: string; email: string } | null;
type CompanyRef = { id: string; name: string; slug: string } | null;
type ProjectRef = { id: string; name: string; slug: string } | null;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  visibility: CompanyVisibility;
  createdAt: string;
  owner: OwnerRef;
  totalMember: number;
  totalTeam: number;
}

export interface AdminProfile {
  id: string;
  displayName: string;
  role: ProfileRole;
  status: ProfileStatus;
  visibility: string;
  createdAt: string;
  user: OwnerRef;
  company: CompanyRef;
}

export interface AdminTeam {
  id: string;
  name: string;
  slug: string;
  visibility: string;
  createdAt: string;
  company: CompanyRef;
  totalMember: number;
}

export interface AdminProject {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: string;
  owner: OwnerRef;
}

export interface AdminEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  isActive: boolean;
  createdAt: string;
  project: ProjectRef;
}

export interface AdminRequestLog {
  id: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  duration: number;
  createdAt: string;
  projectId: string;
  endpointId: string | null;
  project: ProjectRef;
}

export interface AdminProfileListParams extends AdminListParams {
  companyId?: string;
  status?: ProfileStatus;
  role?: ProfileRole;
}

export interface AdminEndpointListParams extends AdminListParams {
  projectId?: string;
  method?: HttpMethod;
}

export interface AdminRequestLogListParams extends AdminListParams {
  projectId?: string;
  method?: HttpMethod;
  statusCode?: number;
}

export interface PlatformStats {
  counts: {
    users: number;
    companies: number;
    profiles: number;
    teams: number;
    projects: number;
    endpoints: number;
    requestLogs: number;
  };
  signupsLast7d: number;
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
}

export interface ImpersonationResult {
  token: string;
  user: AdminUser;
  expiresAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Redis cache console                                                 */
/* ------------------------------------------------------------------ */

export interface CacheSectionStat {
  name: string;
  keys: number;
  memory: number;
}

export interface CacheOverview {
  connected: boolean;
  totalKeys: number;
  totalMemory: number;
  hitRate: number;
  hits: number;
  misses: number;
  sections: CacheSectionStat[];
}

export interface CacheKeyInfo {
  key: string;
  ttl: number;
  type: string;
  size: number;
}

export interface CacheEntry extends CacheKeyInfo {
  value: string | null;
}

export interface CacheKeyListParams {
  section?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

export type CacheKeyList = {
  data: CacheKeyInfo[];
  meta: PageMeta & { truncated: boolean };
};
