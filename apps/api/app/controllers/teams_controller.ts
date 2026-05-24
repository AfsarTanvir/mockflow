import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import Company from '../models/company.js';
import CompanyMetadata from '../models/company_metadata.js';
import Profile from '../models/profile.js';
import Team from '../models/team.js';
import TeamMembership from '../models/team_membership.js';
import TeamMetadata from '../models/team_metadata.js';
import { createTeamValidator, updateTeamValidator } from '../validators/team_validator.js';
import * as TeamService from '../services/team_service.js';

type CompanyRole = 'owner' | 'admin' | 'member' | 'viewer';
const COMPANY_ROLE_RANK: Record<CompanyRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

async function findActorProfile(userId: string | null, companyId: string): Promise<Profile | null> {
  if (!userId) return null;
  return Profile.query()
    .where('user_id', userId)
    .where('company_id', companyId)
    .where('status', 'active')
    .first();
}

async function getTeamMembership(
  profileId: string,
  teamId: string
): Promise<TeamMembership | null> {
  return TeamMembership.query().where('profile_id', profileId).where('team_id', teamId).first();
}

function canCreateTeam(actor: Profile, settings: { members_can_create_teams?: boolean }): boolean {
  if (COMPANY_ROLE_RANK[actor.role] >= COMPANY_ROLE_RANK.admin) return true;
  if (actor.role === 'member' && settings?.members_can_create_teams === true) return true;
  return false;
}

async function canManageTeam(actor: Profile, team: Team): Promise<boolean> {
  if (COMPANY_ROLE_RANK[actor.role] >= COMPANY_ROLE_RANK.admin) return true;
  const tm = await getTeamMembership(actor.id, team.id);
  return tm?.role === 'admin';
}

/**
 * Visibility check: can this (possibly anonymous) viewer see this team's existence?
 * Full implementation lives in `permission_resolver.ts` (Day 4); duplicated inline here
 * so Day 2 doesn't depend on Day 4. Refactor in Day 4.
 */
async function canSeeTeam(
  viewer: Profile | null,
  team: Team,
  company: Company
): Promise<boolean> {
  if (viewer) {
    const tm = await getTeamMembership(viewer.id, team.id);
    if (tm) return true;
    if (viewer.companyId === company.id && viewer.status === 'active') {
      return team.visibility !== 'private';
    }
  }
  return company.visibility === 'public' && team.visibility === 'public';
}

function teamView(team: Team, metadata: TeamMetadata | null) {
  return {
    id: team.id,
    companyId: team.companyId,
    name: team.name,
    slug: team.slug,
    description: team.description,
    visibility: team.visibility,
    avatarUrl: metadata?.avatarUrl ?? null,
    color: metadata?.color ?? null,
    externalLinks: metadata?.externalLinks ?? [],
    settings: metadata?.settings ?? {},
    totalMember: metadata?.totalMember ?? 0,
    createdByProfileId: team.createdByProfileId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

export default class TeamsController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/companies/:companyId/teams   (auth required)
  | Any active company member can list teams they're allowed to see.
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const company = await Company.find(params.companyId);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await findActorProfile(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const teams = await Team.query()
      .where('company_id', company.id)
      .preload('metadata')
      .orderBy('created_at', 'asc');

    // Filter by visibility: actor sees all teams they're a member of, plus any
    // team that is company_member_only or public.
    const memberships = await TeamMembership.query()
      .where('profile_id', actor.id)
      .whereIn(
        'team_id',
        teams.map((t) => t.id)
      );
    const memberOf = new Set(memberships.map((m) => m.teamId));

    const visible = teams.filter(
      (t) => memberOf.has(t.id) || t.visibility !== 'private'
    );

    return response.ok(visible.map((t) => teamView(t, t.metadata ?? null)));
  }

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/companies/:companyId/teams   (auth required)
  | Owner/admin always allowed. Member allowed if settings.members_can_create_teams.
  |--------------------------------------------------------------------------
  */
  async store({ auth, params, request, response }: HttpContext) {
    const company = await Company.find(params.companyId);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await findActorProfile(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const metadata = await CompanyMetadata.find(company.id);
    if (!canCreateTeam(actor, metadata?.settings ?? {})) {
      return response.forbidden({ message: 'You do not have permission to create teams' });
    }

    const data = await request.validateUsing(createTeamValidator);

    try {
      const team = await TeamService.createTeam(company.id, actor.id, data);
      const teamMeta = await TeamMetadata.find(team.id);
      return response.created(teamView(team, teamMeta));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/teams/:id   (public, visibility-gated)
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const team = await Team.find(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const company = await Company.find(team.companyId);
    if (!company) return response.notFound({ message: 'Team not found' });

    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    const viewer = await findActorProfile(userId, company.id);
    const allowed = await canSeeTeam(viewer, team, company);
    if (!allowed) return response.notFound({ message: 'Team not found' });

    const metadata = await TeamMetadata.find(team.id);
    return response.ok(teamView(team, metadata));
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/teams/:id   (auth required, team admin or company admin+)
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const team = await Team.find(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    if (!(await canManageTeam(actor, team))) {
      return response.forbidden({ message: 'Only team admins or company admins can update this team' });
    }

    const data = await request.validateUsing(updateTeamValidator);

    try {
      const updated = await TeamService.updateTeam(team.id, data);
      const metadata = await TeamMetadata.find(updated.id);
      return response.ok(teamView(updated, metadata));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/teams/:id   (auth required, team admin or company admin+)
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const team = await Team.find(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await findActorProfile(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    if (!(await canManageTeam(actor, team))) {
      return response.forbidden({ message: 'Only team admins or company admins can delete this team' });
    }

    try {
      await TeamService.deleteTeam(team.id);
      return response.ok({ message: 'Team deleted' });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }
}
