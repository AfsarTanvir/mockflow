import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import type Company from '#models/company';
import type Profile from '#models/profile';
import type Team from '#models/team';
import type TeamMetadata from '#models/team_metadata';
import * as CompanyQueries from '#queries/company_queries';
import * as ProfileQueries from '#queries/profile_queries';
import * as TeamQueries from '#queries/team_queries';
import * as TeamMembershipQueries from '#queries/team_membership_queries';
import * as TeamService from '#services/team_service';
import { canSeeTeam } from '#services/permission_resolver';
import { createTeamValidator, updateTeamValidator } from '#validators/team_validator';

type CompanyRole = 'owner' | 'admin' | 'member' | 'viewer';
const COMPANY_ROLE_RANK: Record<CompanyRole, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

function canCreateTeam(actor: Profile, settings: { members_can_create_teams?: boolean }): boolean {
  if (COMPANY_ROLE_RANK[actor.role] >= COMPANY_ROLE_RANK.admin) return true;
  if (actor.role === 'member' && settings?.members_can_create_teams === true) return true;
  return false;
}

async function canManageTeam(actor: Profile, team: Team): Promise<boolean> {
  if (COMPANY_ROLE_RANK[actor.role] >= COMPANY_ROLE_RANK.admin) return true;
  const tm = await TeamMembershipQueries.findForProfileTeam(actor.id, team.id);
  return tm?.role === 'admin';
}

/** Loads the viewer's team membership then delegates to the pure resolver. */
async function canSeeTeamWithLoad(
  viewer: Profile | null,
  team: Team,
  company: Company
): Promise<boolean> {
  const viewerMembership = viewer
    ? await TeamMembershipQueries.findForProfileTeam(viewer.id, team.id)
    : null;
  return canSeeTeam(viewer, team, company, viewerMembership);
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
  /** GET /api/companies/:companyId/teams — visibility-filtered list. */
  async index({ auth, params, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.companyId);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const teams = await TeamQueries.listForCompanyWithMetadata(company.id);

    // actor sees teams they're a member of, plus any non-private team.
    const memberships = await TeamMembershipQueries.listForProfileInTeams(
      actor.id,
      teams.map((t) => t.id)
    );
    const memberOf = new Set(memberships.map((m) => m.teamId));
    const visible = teams.filter((t) => memberOf.has(t.id) || t.visibility !== 'private');

    return response.ok(visible.map((t) => teamView(t, t.metadata ?? null)));
  }

  /** POST /api/companies/:companyId/teams */
  async store({ auth, params, request, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.companyId);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const metadata = await CompanyQueries.findMetadata(company.id);
    if (!canCreateTeam(actor, metadata?.settings ?? {})) {
      return response.forbidden({ message: 'You do not have permission to create teams' });
    }

    const data = await request.validateUsing(createTeamValidator);
    try {
      const team = await TeamService.createTeam(company.id, actor.id, data);
      const teamMeta = await TeamQueries.findMetadata(team.id);
      return response.created(teamView(team, teamMeta));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/teams/:id — public, visibility-gated. */
  async show({ auth, params, response }: HttpContext) {
    const team = await TeamQueries.findById(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const company = await CompanyQueries.findById(team.companyId);
    if (!company) return response.notFound({ message: 'Team not found' });

    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    const viewer = userId
      ? await ProfileQueries.findActiveByUserAndCompany(userId, company.id)
      : null;
    const allowed = await canSeeTeamWithLoad(viewer, team, company);
    if (!allowed) return response.notFound({ message: 'Team not found' });

    const metadata = await TeamQueries.findMetadata(team.id);
    return response.ok(teamView(team, metadata));
  }

  /** PUT /api/teams/:id — team admin or company admin+. */
  async update({ auth, params, request, response }: HttpContext) {
    const team = await TeamQueries.findById(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    if (!(await canManageTeam(actor, team))) {
      return response.forbidden({
        message: 'Only team admins or company admins can update this team',
      });
    }

    const data = await request.validateUsing(updateTeamValidator);
    try {
      const updated = await TeamService.updateTeam(team.id, data);
      const metadata = await TeamQueries.findMetadata(updated.id);
      return response.ok(teamView(updated, metadata));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/teams/:id — team admin or company admin+. */
  async destroy({ auth, params, response }: HttpContext) {
    const team = await TeamQueries.findById(params.id);
    if (!team) return response.notFound({ message: 'Team not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, team.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    if (!(await canManageTeam(actor, team))) {
      return response.forbidden({
        message: 'Only team admins or company admins can delete this team',
      });
    }

    try {
      await TeamService.deleteTeam(team.id);
      return response.ok({ message: 'Team deleted' });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
