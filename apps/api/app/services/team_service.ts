import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import Team from '../models/team.js';
import TeamMetadata from '../models/team_metadata.js';
import CompanyMetadata from '../models/company_metadata.js';
import type { TeamVisibility } from '../models/team.js';
import type { TeamExternalLink, TeamSettings } from '../models/team_metadata.js';
import { slugify } from './slug_helper.js';

export interface CreateTeamInput {
  name: string;
  description?: string | null;
  visibility?: TeamVisibility;
  avatarUrl?: string | null;
  color?: string | null;
  externalLinks?: TeamExternalLink[];
  settings?: TeamSettings;
}

/**
 * Atomic creation:
 *   1. Insert team row (slug derived from name)
 *   2. Insert team_metadata with total_member=0
 *   3. Increment company_metadata.total_team
 *
 * Returns the team. Caller is responsible for permission checks.
 */
export async function createTeam(
  companyId: string,
  createdByProfileId: string,
  input: CreateTeamInput
): Promise<Team> {
  return db.transaction(async (trx) => {
    const team = await Team.create(
      {
        companyId,
        name: input.name,
        slug: slugify(input.name),
        description: input.description ?? null,
        visibility: input.visibility ?? 'private',
        createdByProfileId,
      },
      { client: trx }
    );

    await TeamMetadata.create(
      {
        teamId: team.id,
        avatarUrl: input.avatarUrl ?? null,
        color: input.color ?? null,
        externalLinks: input.externalLinks ?? [],
        settings: input.settings ?? {},
        totalMember: 0,
      },
      { client: trx }
    );

    await CompanyMetadata.query({ client: trx })
      .where('company_id', companyId)
      .increment('total_team', 1);

    return team;
  });
}

export async function updateTeam(
  teamId: string,
  input: Partial<CreateTeamInput>
): Promise<Team> {
  return db.transaction(async (trx) => {
    const team = await Team.find(teamId, { client: trx });
    if (!team) throw new Exception('Team not found', { status: 404 });

    team.useTransaction(trx);
    if (input.name !== undefined) team.name = input.name;
    if (input.description !== undefined) team.description = input.description;
    if (input.visibility !== undefined) team.visibility = input.visibility;
    await team.save();

    const metadata = await TeamMetadata.find(teamId, { client: trx });
    if (metadata) {
      metadata.useTransaction(trx);
      if (input.avatarUrl !== undefined) metadata.avatarUrl = input.avatarUrl;
      if (input.color !== undefined) metadata.color = input.color;
      if (input.externalLinks !== undefined) metadata.externalLinks = input.externalLinks;
      if (input.settings !== undefined) metadata.settings = input.settings;
      await metadata.save();
    }

    return team;
  });
}

/**
 * Hard-delete a team. team_metadata + team_memberships cascade away.
 * company_metadata.total_team is decremented inside the same tx.
 */
export async function deleteTeam(teamId: string): Promise<void> {
  await db.transaction(async (trx) => {
    const team = await Team.find(teamId, { client: trx });
    if (!team) throw new Exception('Team not found', { status: 404 });

    const companyId = team.companyId;
    team.useTransaction(trx);
    await team.delete();

    await CompanyMetadata.query({ client: trx })
      .where('company_id', companyId)
      .decrement('total_team', 1);
  });
}
