/* eslint-disable no-console -- progress output is the point of a seeder */
import { BaseSeeder } from '@adonisjs/lucid/seeders';
import db from '@adonisjs/lucid/services/db';
import hash from '@adonisjs/core/services/hash';
import { DateTime } from 'luxon';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

import Profile from '../../app/models/profile.js';
import ProfileMetadata from '../../app/models/profile_metadata.js';
import TeamMembership from '../../app/models/team_membership.js';
import TeamMetadata from '../../app/models/team_metadata.js';
import CompanyMetadata from '../../app/models/company_metadata.js';
import Project from '../../app/models/project.js';
import TeamMember from '../../app/models/team_member.js';
import Endpoint from '../../app/models/endpoint.js';
import Company from '../../app/models/company.js';
import * as CompanyService from '../../app/services/company_service.js';
import * as TeamService from '../../app/services/team_service.js';
import { slugify } from '../../app/services/slug_helper.js';

/**
 * ============================================================================
 *  FAKE / DEMO DATA SEEDER  (opt-in — does NOT run on a normal `db:seed`)
 * ============================================================================
 *
 *  Generates a realistic, multi-tenant dataset for exercising the master-agency
 *  admin console: many companies, users, profiles, teams, projects, endpoints
 *  and request logs.
 *
 *  RUN IT:        npm run seed:fake            (sets SEED_FAKE=true for you)
 *  TUNE IT:       edit the CONFIG block below, or override the headline counts
 *                 with env vars, e.g.  SEED_COMPANIES=40 SEED_USERS=500 npm run seed:fake
 *
 *  SAFETY:
 *   - Guarded by SEED_FAKE — `db:seed` / `migration:fresh --seed` will SKIP it.
 *   - Everything is tagged: users use the `@seed.test` email domain, companies
 *     use the `seed-` slug prefix. Re-running first DELETES only that tagged
 *     data (companies first — owner_user_id is RESTRICT — then users; FK cascade
 *     removes profiles, teams, projects, endpoints, logs, …) and regenerates.
 *     Your real dev user / Acme / MockFlow Ops are never touched.
 *   - faker is seeded, so re-runs produce the same data.
 *
 *  The master agency = the existing `mockflow-ops` company (the dev super-admin),
 *  into which a few "ops staff" profiles are added so it isn't empty.
 */

/** Read a positive-int env override, else fall back to the CONFIG default. */
function envNum(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const CONFIG = {
  fakerSeed: envNum('SEED_FAKER_SEED', 20260606),

  // ---- headline counts (env-overridable) ----
  companies: envNum('SEED_COMPANIES', 25),
  users: envNum('SEED_USERS', 200),
  opsStaff: envNum('SEED_OPS_STAFF', 6), // fake members added to the master agency

  // ---- per-entity ranges (edit here to scale) ----
  membersPerCompany: { min: 5, max: 12 },
  teamsPerCompany: { min: 1, max: 4 },
  membersPerTeam: { min: 2, max: 6 },
  projectsPerMember: { min: 1, max: 4 }, // "lots of projects"
  collaboratorsPerProject: { min: 0, max: 4 },
  endpointsPerProject: { min: 2, max: 8 },
  logsPerEndpoint: { min: envNum('SEED_LOGS_MIN', 10), max: envNum('SEED_LOGS_MAX', 30) },

  // ---- misc ----
  logSpreadDays: 30,
  userSpreadDays: 60,
  password: process.env.SEED_PASSWORD || 'password123',
  userEmailDomain: 'seed.test',
  companySlugPrefix: 'seed-',
  masterCompanySlug: 'mockflow-ops',
} as const;

type Range = { min: number; max: number };

const ri = (r: Range) => faker.number.int({ min: r.min, max: r.max });

/** A JS Date within the last `days`, biased toward the recent end. */
function spreadDate(days: number): Date {
  const bias = Math.pow(faker.number.float({ min: 0, max: 1 }), 1.7); // → recent-heavy
  return new Date(Date.now() - bias * days * 24 * 60 * 60 * 1000);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const RESOURCES = [
  'users',
  'orders',
  'products',
  'invoices',
  'sessions',
  'payments',
  'events',
  'customers',
  'files',
  'reports',
  'webhooks',
  'subscriptions',
];

const METHOD = () =>
  faker.helpers.weightedArrayElement([
    { weight: 50, value: 'GET' },
    { weight: 20, value: 'POST' },
    { weight: 12, value: 'PUT' },
    { weight: 8, value: 'PATCH' },
    { weight: 10, value: 'DELETE' },
  ]);

const STATUS = () =>
  faker.helpers.weightedArrayElement([
    { weight: 60, value: 200 },
    { weight: 15, value: 201 },
    { weight: 5, value: 204 },
    { weight: 5, value: 400 },
    { weight: 8, value: 404 },
    { weight: 7, value: 500 },
  ]);

function responseBody(): Record<string, unknown> {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    status: faker.helpers.arrayElement(['active', 'pending', 'archived']),
    amount: Number(faker.commerce.price()),
    createdAt: faker.date.recent({ days: 90 }).toISOString(),
  };
}

interface SeededUser {
  id: string;
  name: string;
}
interface CompanyCtx {
  companyId: string;
  ownerUserId: string;
  /** active member user ids (incl. owner) — pool for project owners & collaborators */
  activeUserIds: string[];
}

export default class extends BaseSeeder {
  async run() {
    if (process.env.SEED_FAKE !== 'true') {
      console.log('[fake_seeder] skipped — run `npm run seed:fake` (or set SEED_FAKE=true).');
      return;
    }

    const t0 = Date.now();
    faker.seed(CONFIG.fakerSeed);
    console.log('[fake_seeder] generating demo data…', {
      companies: CONFIG.companies,
      users: CONFIG.users,
    });

    // ---------------------------------------------------------------- teardown
    // Companies first (owner_user_id is RESTRICT), then users. FK cascades clean
    // up profiles, metadata, teams, memberships, projects, endpoints, logs.
    const delCompanies = await db
      .from('companies')
      .where('slug', 'like', `${CONFIG.companySlugPrefix}%`)
      .delete();
    const delUsers = await db
      .from('users')
      .where('email', 'like', `%@${CONFIG.userEmailDomain}`)
      .delete();
    if (delCompanies || delUsers) {
      console.log(`[fake_seeder] cleared prior fake data (${delCompanies} co, ${delUsers} users)`);
    }

    // -------------------------------------------------------------- 1. users
    const passwordHash = await hash.use('scrypt').make(CONFIG.password);
    const users: SeededUser[] = [];
    const userRows = Array.from({ length: CONFIG.users }, (_, i) => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const id = randomUUID();
      const createdAt = spreadDate(CONFIG.userSpreadDays);
      users.push({ id, name: `${first} ${last}` });
      return {
        id,
        name: `${first} ${last}`,
        email: `${slugify(first)}.${slugify(last)}.${i}@${CONFIG.userEmailDomain}`,
        password: passwordHash,
        avatar_url: null,
        email_verified: true,
        created_at: createdAt,
        updated_at: createdAt,
      };
    });
    for (const part of chunk(userRows, 500)) await db.table('users').multiInsert(part);

    // ------------------------------------------------ 2. companies + members + teams
    const companyCtxs: CompanyCtx[] = [];
    let totalMembers = 0;
    let totalTeams = 0;

    for (let c = 0; c < CONFIG.companies; c++) {
      const owner = users[c % users.length];
      const name = faker.company.name();

      const { company, profile: ownerProfile } = await CompanyService.createCompany(owner.id, {
        name,
        visibility: faker.helpers.arrayElement(['private', 'protected', 'public']),
        description: faker.company.catchPhrase(),
        website: faker.internet.url(),
        industry: faker.commerce.department(),
        sizeBucket: faker.helpers.arrayElement(['1-10', '11-50', '51-200', '201-1000', '1000+']),
      });
      // Tag the slug (unique by index) for clean teardown.
      company.slug = `${CONFIG.companySlugPrefix}${c + 1}-${slugify(name)}`.slice(0, 80);
      await company.save();

      // members — distinct users drawn from the global pool (excluding the owner),
      // so some users naturally end up in several companies (multi-tenant).
      const memberCount = Math.min(ri(CONFIG.membersPerCompany), users.length - 1);
      const candidates = faker.helpers
        .arrayElements(
          users.filter((u) => u.id !== owner.id),
          memberCount
        )
        .map((u) => {
          const status = faker.helpers.weightedArrayElement([
            { weight: 80, value: 'active' as const },
            { weight: 12, value: 'suspended' as const },
            { weight: 8, value: 'inactive' as const },
          ]);
          return {
            user: u,
            role: faker.helpers.weightedArrayElement([
              { weight: 20, value: 'admin' as const },
              { weight: 65, value: 'member' as const },
              { weight: 15, value: 'viewer' as const },
            ]),
            status,
          };
        });

      const memberProfiles = await Profile.createMany(
        candidates.map((m) => ({
          userId: m.user.id,
          companyId: company.id,
          displayName: m.user.name,
          avatarUrl: null,
          role: m.role,
          status: m.status,
          visibility: faker.helpers.arrayElement(['public', 'company_member_only'] as const),
          joinedAt: DateTime.fromJSDate(spreadDate(45)),
          leftAt: m.status === 'inactive' ? DateTime.fromJSDate(spreadDate(15)) : null,
        }))
      );
      await ProfileMetadata.createMany(
        memberProfiles.map((p) => ({
          profileId: p.id,
          jobTitle: faker.person.jobTitle(),
          department: faker.commerce.department(),
          bio: faker.lorem.sentence(),
          links: [],
          preferences: {},
        }))
      );

      // counter: members that actually count (left/inactive don't); +1 owner already set.
      const counted = candidates.filter((m) => m.status !== 'inactive').length;
      if (counted) {
        await CompanyMetadata.query()
          .where('company_id', company.id)
          .increment('total_member', counted);
      }
      totalMembers += counted + 1;

      // active member profiles (incl. owner) — used for teams, project owners, collaborators
      const activeProfiles = [
        { profileId: ownerProfile.id, userId: owner.id },
        ...memberProfiles
          .filter((p) => p.status === 'active')
          .map((p) => ({ profileId: p.id, userId: p.userId })),
      ];

      // teams — distinct names per company (teams.slug unique per company)
      const teamCount = ri(CONFIG.teamsPerCompany);
      const teamNames = faker.helpers.arrayElements(
        RESOURCES.map((r) => `${r[0].toUpperCase()}${r.slice(1)} Team`),
        teamCount
      );
      for (const teamName of teamNames) {
        const team = await TeamService.createTeam(company.id, ownerProfile.id, {
          name: teamName,
          description: faker.lorem.sentence(),
          visibility: faker.helpers.arrayElement(['private', 'company_member_only', 'public']),
        });
        totalTeams++;
        const picked = faker.helpers.arrayElements(
          activeProfiles,
          Math.min(ri(CONFIG.membersPerTeam), activeProfiles.length)
        );
        if (picked.length) {
          await TeamMembership.createMany(
            picked.map((p) => ({
              teamId: team.id,
              profileId: p.profileId,
              role: faker.helpers.weightedArrayElement([
                { weight: 25, value: 'admin' as const },
                { weight: 75, value: 'member' as const },
              ]),
              joinedAt: DateTime.fromJSDate(spreadDate(40)),
            }))
          );
          await TeamMetadata.query()
            .where('team_id', team.id)
            .increment('total_member', picked.length);
        }
      }

      companyCtxs.push({
        companyId: company.id,
        ownerUserId: owner.id,
        activeUserIds: activeProfiles.map((p) => p.userId),
      });
    }

    // ----------------------------------------------------------- 3. projects
    // Projects are user-owned (no company_id). We create them per active member
    // and draw collaborators from the same company, so they stay coherent.
    interface ProjRow {
      id: string;
      ownerId: string;
      coUserIds: string[];
    }
    const projMeta: ProjRow[] = [];
    const projectRows: Record<string, unknown>[] = [];
    let pIdx = 0;
    for (const ctx of companyCtxs) {
      for (const ownerUserId of ctx.activeUserIds) {
        const n = ri(CONFIG.projectsPerMember);
        for (let k = 0; k < n; k++) {
          const id = randomUUID();
          const name = faker.commerce.productName();
          projectRows.push({
            id,
            name,
            slug: `${slugify(name).slice(0, 108)}-${pIdx}`,
            basePath: '/',
            ownerId: ownerUserId,
            isPublic: faker.datatype.boolean({ probability: 0.3 }),
            settings: { cors: true, log_requests: true, global_headers: {} },
          });
          projMeta.push({
            id,
            ownerId: ownerUserId,
            coUserIds: ctx.activeUserIds.filter((u) => u !== ownerUserId),
          });
          pIdx++;
        }
      }
    }
    for (const part of chunk(projectRows, 500)) await Project.createMany(part);

    // ------------------------------------------- 4. project team_members (access)
    const teamMemberRows: Record<string, unknown>[] = [];
    for (const p of projMeta) {
      teamMemberRows.push({
        projectId: p.id,
        userId: p.ownerId,
        role: 'owner',
        invitedAt: DateTime.now(),
      });
      const collabs = faker.helpers.arrayElements(
        p.coUserIds,
        Math.min(ri(CONFIG.collaboratorsPerProject), p.coUserIds.length)
      );
      for (const u of collabs) {
        teamMemberRows.push({
          projectId: p.id,
          userId: u,
          role: faker.helpers.weightedArrayElement([
            { weight: 15, value: 'admin' as const },
            { weight: 45, value: 'member' as const },
            { weight: 40, value: 'viewer' as const },
          ]),
          invitedAt: DateTime.now(),
        });
      }
    }
    for (const part of chunk(teamMemberRows, 500)) await TeamMember.createMany(part);

    // ----------------------------------------------------------- 5. endpoints
    interface EpRow {
      id: string;
      projectId: string;
      method: string;
      path: string;
      statusCode: number;
    }
    const endpoints: EpRow[] = [];
    const endpointRows: Record<string, unknown>[] = [];
    for (const p of projMeta) {
      const n = ri(CONFIG.endpointsPerProject);
      const seen = new Set<string>();
      let guard = 0;
      while (seen.size < n && guard++ < n * 5) {
        const method = METHOD();
        const resource = faker.helpers.arrayElement(RESOURCES);
        const item = faker.datatype.boolean();
        const path = item ? `/api/${resource}/:id` : `/api/${resource}`;
        const key = `${method} ${path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const id = randomUUID();
        const statusCode = STATUS();
        endpoints.push({ id, projectId: p.id, method, path, statusCode });
        endpointRows.push({
          id,
          projectId: p.id,
          method,
          path,
          statusCode,
          responseBody: statusCode >= 400 ? { error: faker.lorem.words(3) } : responseBody(),
          responseHeaders: {},
          delayMs: faker.helpers.arrayElement([0, 0, 0, 50, 150, 300]),
          delayMaxMs: null,
          isActive: faker.datatype.boolean({ probability: 0.9 }),
          createdBy: p.ownerId,
        });
      }
    }
    for (const part of chunk(endpointRows, 500)) await Endpoint.createMany(part);

    // -------------------------------------------------------- 6. request logs
    let logCount = 0;
    let logBuffer: Record<string, unknown>[] = [];
    const flush = async () => {
      if (!logBuffer.length) return;
      await db.table('request_logs').multiInsert(logBuffer);
      logCount += logBuffer.length;
      logBuffer = [];
    };
    for (const ep of endpoints) {
      const n = ri(CONFIG.logsPerEndpoint);
      for (let i = 0; i < n; i++) {
        const status = faker.helpers.weightedArrayElement([
          { weight: 70, value: ep.statusCode },
          { weight: 12, value: 200 },
          { weight: 6, value: 404 },
          { weight: 6, value: 400 },
          { weight: 6, value: 500 },
        ]);
        logBuffer.push({
          project_id: ep.projectId,
          endpoint_id: ep.id,
          method: ep.method,
          path: ep.path,
          status_code: status,
          duration: faker.number.int({ min: 3, max: 1200 }),
          created_at: spreadDate(CONFIG.logSpreadDays),
        });
        if (logBuffer.length >= 1000) await flush();
      }
    }
    await flush();

    // ----------------------------------------------- 7. ops staff in master agency
    let opsCount = 0;
    const master = await Company.findBy('slug', CONFIG.masterCompanySlug);
    if (master && CONFIG.opsStaff > 0) {
      const staff = users.slice(-CONFIG.opsStaff);
      const staffProfiles = await Profile.createMany(
        staff.map((u) => ({
          userId: u.id,
          companyId: master.id,
          displayName: u.name,
          avatarUrl: null,
          role: faker.helpers.arrayElement(['admin', 'member'] as const),
          status: 'active' as const,
          visibility: 'company_member_only' as const,
          joinedAt: DateTime.fromJSDate(spreadDate(50)),
          leftAt: null,
        }))
      );
      await ProfileMetadata.createMany(
        staffProfiles.map((p) => ({ profileId: p.id, links: [], preferences: {} }))
      );
      await CompanyMetadata.query()
        .where('company_id', master.id)
        .increment('total_member', staffProfiles.length);
      opsCount = staffProfiles.length;
    } else if (!master) {
      console.warn(
        `[fake_seeder] master company "${CONFIG.masterCompanySlug}" not found — run the main seeder first to seed ops staff.`
      );
    }

    console.log('[fake_seeder] done ✓', {
      seconds: Math.round((Date.now() - t0) / 1000),
      users: users.length,
      companies: companyCtxs.length,
      memberProfiles: totalMembers,
      teams: totalTeams,
      projects: projMeta.length,
      endpoints: endpoints.length,
      requestLogs: logCount,
      opsStaff: opsCount,
      login: `any fake user uses password "${CONFIG.password}" (emails @${CONFIG.userEmailDomain})`,
    });
  }
}
