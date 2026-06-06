import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import User from '#models/user';
import Company from '#models/company';
import Profile from '#models/profile';
import Team from '#models/team';
import Project from '#models/project';
import Endpoint from '#models/endpoint';
import RequestLog from '#models/request_log';

/**
 * UNSCOPED platform-admin data access. These intentionally bypass company
 * scoping — they're only ever reached behind the `superAdmin` middleware.
 * Every list is paginated; sort is whitelisted (never interpolate raw input).
 */

export interface ListOpts {
  page: number;
  perPage: number;
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
}

/** Map an API sort key to a real (whitelisted) DB column, else fall back. */
function sortColumn(
  allowed: Record<string, string>,
  sort?: string,
  fallback = 'created_at'
): string {
  return sort && allowed[sort] ? allowed[sort] : fallback;
}

function like(value: string): string {
  return `%${value}%`;
}

export function listUsers(opts: ListOpts) {
  const q = User.query();
  if (opts.search) {
    const s = like(opts.search);
    q.where((b) => b.whereILike('name', s).orWhereILike('email', s));
  }
  q.orderBy(
    sortColumn({ name: 'name', email: 'email', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export function listCompanies(opts: ListOpts) {
  const q = Company.query().preload('owner').preload('metadata');
  if (opts.search) {
    const s = like(opts.search);
    q.where((b) => b.whereILike('name', s).orWhereILike('slug', s));
  }
  q.orderBy(
    sortColumn({ name: 'name', slug: 'slug', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export interface ProfileListOpts extends ListOpts {
  companyId?: string;
  status?: string;
  role?: string;
}

export function listProfiles(opts: ProfileListOpts) {
  const q = Profile.query().preload('user').preload('company');
  if (opts.search) q.whereILike('display_name', like(opts.search));
  if (opts.companyId) q.where('company_id', opts.companyId);
  if (opts.status) q.where('status', opts.status);
  if (opts.role) q.where('role', opts.role);
  q.orderBy(
    sortColumn({ role: 'role', status: 'status', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export function listTeams(opts: ListOpts) {
  const q = Team.query().preload('company').preload('metadata');
  if (opts.search) {
    const s = like(opts.search);
    q.where((b) => b.whereILike('name', s).orWhereILike('slug', s));
  }
  q.orderBy(
    sortColumn({ name: 'name', slug: 'slug', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export function listProjects(opts: ListOpts) {
  const q = Project.query().preload('owner');
  if (opts.search) {
    const s = like(opts.search);
    q.where((b) => b.whereILike('name', s).orWhereILike('slug', s));
  }
  q.orderBy(
    sortColumn({ name: 'name', slug: 'slug', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export interface EndpointListOpts extends ListOpts {
  projectId?: string;
  method?: string;
}

export function listEndpoints(opts: EndpointListOpts) {
  const q = Endpoint.query().preload('project');
  if (opts.search) q.whereILike('path', like(opts.search));
  if (opts.projectId) q.where('project_id', opts.projectId);
  if (opts.method) q.where('method', opts.method);
  q.orderBy(
    sortColumn({ method: 'method', path: 'path', createdAt: 'created_at' }, opts.sort),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

export interface RequestLogListOpts extends ListOpts {
  projectId?: string;
  method?: string;
  statusCode?: number;
}

export function listRequestLogs(opts: RequestLogListOpts) {
  const q = RequestLog.query().preload('project').preload('endpoint');
  if (opts.projectId) q.where('project_id', opts.projectId);
  if (opts.method) q.where('method', opts.method);
  if (opts.statusCode) q.where('status_code', opts.statusCode);
  q.orderBy(
    sortColumn(
      { statusCode: 'status_code', duration: 'duration', createdAt: 'created_at' },
      opts.sort
    ),
    opts.dir ?? 'desc'
  );
  return q.paginate(opts.page, opts.perPage);
}

/* Single-row fetchers (unscoped) for detail / management targets. */
export function findUser(id: string) {
  return User.find(id);
}

export function findCompany(id: string) {
  return Company.query().where('id', id).preload('owner').preload('metadata').first();
}

export function findProfile(id: string) {
  return Profile.query().where('id', id).preload('user').preload('company').first();
}

async function countTable(table: string): Promise<number> {
  const rows = await db.from(table).count('* as total');
  return Number(rows[0]?.total ?? 0);
}

export async function getPlatformStats() {
  const since = DateTime.now().minus({ days: 7 }).toSQL({ includeOffset: false })!;
  const [
    users,
    companies,
    profiles,
    teams,
    projects,
    endpoints,
    requestLogs,
    signupsLast7d,
    recentUsers,
  ] = await Promise.all([
    countTable('users'),
    countTable('companies'),
    countTable('profiles'),
    countTable('teams'),
    countTable('projects'),
    countTable('endpoints'),
    countTable('request_logs'),
    db
      .from('users')
      .where('created_at', '>=', since)
      .count('* as total')
      .then((r) => Number(r[0]?.total ?? 0)),
    User.query().orderBy('created_at', 'desc').limit(10),
  ]);

  return {
    counts: { users, companies, profiles, teams, projects, endpoints, requestLogs },
    signupsLast7d,
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    })),
  };
}
