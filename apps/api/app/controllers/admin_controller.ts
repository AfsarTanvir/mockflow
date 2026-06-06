import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as AdminService from '#services/admin_service';
import {
  adminListValidator,
  adminProfileListValidator,
  adminEndpointListValidator,
  adminRequestLogListValidator,
  adminChangeRoleValidator,
} from '#validators/admin_validator';
import { updateCompanyValidator, transferOwnershipValidator } from '#validators/company_validator';
import type User from '#models/user';
import type Company from '#models/company';
import type Profile from '#models/profile';
import type Team from '#models/team';
import type Project from '#models/project';
import type Endpoint from '#models/endpoint';
import type RequestLog from '#models/request_log';

interface Paginator<T> {
  all(): T[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasMorePages: boolean;
}

function paginated<T>(p: Paginator<T>, map: (row: T) => unknown) {
  return {
    data: p.all().map(map),
    meta: {
      total: p.total,
      perPage: p.perPage,
      currentPage: p.currentPage,
      lastPage: p.lastPage,
      hasMore: p.hasMorePages,
    },
  };
}

function listOpts(data: {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}) {
  return {
    page: data.page ?? 1,
    perPage: data.perPage ?? 20,
    search: data.search,
    sort: data.sort,
    dir: data.dir,
  };
}

/* ---- output shapers (never leak internal columns) ---- */
const userView = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  avatarUrl: u.avatarUrl,
  emailVerified: u.emailVerified,
  createdAt: u.createdAt,
});

const companyView = (c: Company) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  visibility: c.visibility,
  createdAt: c.createdAt,
  owner: c.owner ? { id: c.owner.id, name: c.owner.name, email: c.owner.email } : null,
  totalMember: c.metadata?.totalMember ?? 0,
  totalTeam: c.metadata?.totalTeam ?? 0,
});

const profileView = (p: Profile) => ({
  id: p.id,
  displayName: p.displayName,
  role: p.role,
  status: p.status,
  visibility: p.visibility,
  createdAt: p.createdAt,
  user: p.user ? { id: p.user.id, name: p.user.name, email: p.user.email } : null,
  company: p.company ? { id: p.company.id, name: p.company.name, slug: p.company.slug } : null,
});

const teamView = (t: Team) => ({
  id: t.id,
  name: t.name,
  slug: t.slug,
  visibility: t.visibility,
  createdAt: t.createdAt,
  company: t.company ? { id: t.company.id, name: t.company.name, slug: t.company.slug } : null,
  totalMember: t.metadata?.totalMember ?? 0,
});

const projectView = (pr: Project) => ({
  id: pr.id,
  name: pr.name,
  slug: pr.slug,
  isPublic: pr.isPublic,
  createdAt: pr.createdAt,
  owner: pr.owner ? { id: pr.owner.id, name: pr.owner.name, email: pr.owner.email } : null,
});

const endpointView = (e: Endpoint) => ({
  id: e.id,
  method: e.method,
  path: e.path,
  statusCode: e.statusCode,
  isActive: e.isActive,
  createdAt: e.createdAt,
  project: e.project ? { id: e.project.id, name: e.project.name, slug: e.project.slug } : null,
});

const requestLogView = (l: RequestLog) => ({
  id: l.id,
  method: l.method,
  path: l.path,
  statusCode: l.statusCode,
  duration: l.duration,
  createdAt: l.createdAt,
  projectId: l.projectId,
  endpointId: l.endpointId,
  project: l.project ? { id: l.project.id, name: l.project.name, slug: l.project.slug } : null,
});

export default class AdminController {
  /** GET /api/admin/stats */
  async stats({ response }: HttpContext) {
    return response.ok(await AdminService.getStats());
  }

  /** GET /api/admin/users */
  async users({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminListValidator);
    const result = await AdminService.listUsers(listOpts(data));
    return response.ok(paginated(result, userView));
  }

  /** GET /api/admin/companies */
  async companies({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminListValidator);
    const result = await AdminService.listCompanies(listOpts(data));
    return response.ok(paginated(result, companyView));
  }

  /** GET /api/admin/profiles */
  async profiles({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminProfileListValidator);
    const result = await AdminService.listProfiles({
      ...listOpts(data),
      companyId: data.companyId,
      status: data.status,
      role: data.role,
    });
    return response.ok(paginated(result, profileView));
  }

  /** GET /api/admin/teams */
  async teams({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminListValidator);
    const result = await AdminService.listTeams(listOpts(data));
    return response.ok(paginated(result, teamView));
  }

  /** GET /api/admin/projects */
  async projects({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminListValidator);
    const result = await AdminService.listProjects(listOpts(data));
    return response.ok(paginated(result, projectView));
  }

  /** GET /api/admin/endpoints */
  async endpoints({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminEndpointListValidator);
    const result = await AdminService.listEndpoints({
      ...listOpts(data),
      projectId: data.projectId,
      method: data.method,
    });
    return response.ok(paginated(result, endpointView));
  }

  /** GET /api/admin/request-logs */
  async requestLogs({ request, response }: HttpContext) {
    const data = await request.validateUsing(adminRequestLogListValidator);
    const result = await AdminService.listRequestLogs({
      ...listOpts(data),
      projectId: data.projectId,
      method: data.method,
      statusCode: data.statusCode,
    });
    return response.ok(paginated(result, requestLogView));
  }

  /* ---- company management ---- */
  async updateCompany({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(updateCompanyValidator);
    try {
      const company = await AdminService.updateCompany(params.id, data);
      return response.ok(companyView(company));
    } catch (error) {
      return respondError(error, response);
    }
  }

  async deleteCompany({ params, response }: HttpContext) {
    try {
      await AdminService.deleteCompany(params.id);
      return response.ok({ message: 'Company deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  async transferOwnership({ params, request, response }: HttpContext) {
    const { newOwnerProfileId } = await request.validateUsing(transferOwnershipValidator);
    try {
      await AdminService.transferOwnership(params.id, newOwnerProfileId);
      return response.ok({ message: 'Ownership transferred' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /* ---- profile management ---- */
  async suspendProfile({ params, response }: HttpContext) {
    try {
      const p = await AdminService.suspendProfile(params.id);
      return response.ok({ id: p.id, status: p.status });
    } catch (error) {
      return respondError(error, response);
    }
  }

  async reactivateProfile({ params, response }: HttpContext) {
    try {
      const p = await AdminService.reactivateProfile(params.id);
      return response.ok({ id: p.id, status: p.status });
    } catch (error) {
      return respondError(error, response);
    }
  }

  async deleteProfile({ params, response }: HttpContext) {
    try {
      const p = await AdminService.deactivateProfile(params.id);
      return response.ok({ id: p.id, status: p.status });
    } catch (error) {
      return respondError(error, response);
    }
  }

  async changeProfileRole({ params, request, response }: HttpContext) {
    const { role } = await request.validateUsing(adminChangeRoleValidator);
    try {
      const p = await AdminService.changeProfileRole(params.id, role);
      return response.ok(profileView(p));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /* ---- impersonation ---- */
  async impersonate({ auth, params, response }: HttpContext) {
    try {
      const { token, target } = await AdminService.impersonate(params.userId, auth.user!);
      return response.ok({
        token: token.value!.release(),
        user: userView(target),
        expiresAt: token.expiresAt,
      });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
