import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Profile from '#models/profile';
import TeamMetadata from '#models/team_metadata';
import * as CompanyService from '#services/company_service';
import * as TeamService from '#services/team_service';
import * as TeamMembershipService from '#services/team_membership_service';
import * as ProjectService from '#services/project_service';
import type { CreateProjectInput } from '#services/project_service';

/**
 * Authorization matrix for team-owned projects: who may create/delete, plus the
 * team_metadata.total_project counter. createTeamProject/deleteProject are
 * allowed for the company owner/admin or a team admin only.
 */
test.group('team-project authorization', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function makeUser() {
    const id = uniq();
    return User.create({
      name: `U ${id}`,
      email: `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
  }

  async function seed() {
    const ownerUser = await makeUser();
    const { company, profile: ownerProfile } = await CompanyService.createCompany(ownerUser.id, {
      name: `Co ${uniq()}`,
    });
    const team = await TeamService.createTeam(company.id, ownerProfile.id, { name: `T ${uniq()}` });
    return { company, ownerProfile, ownerUser, team };
  }

  /** A company member (optionally made a team admin) — returns the backing user. */
  async function addMember(
    companyId: string,
    opts?: { team?: { id: string }; ownerProfile?: Profile; teamRole?: 'admin' | 'member' }
  ) {
    const user = await makeUser();
    const profile = await Profile.create({
      userId: user.id,
      companyId,
      displayName: user.name,
      avatarUrl: null,
      role: 'member',
      status: 'active',
      visibility: 'company_member_only',
      joinedAt: DateTime.now(),
    });
    if (opts?.team && opts.ownerProfile) {
      await TeamMembershipService.addMember(
        opts.team as never,
        opts.ownerProfile,
        profile.id,
        opts.teamRole ?? 'member'
      );
    }
    return { user, profile };
  }

  const input = (name: string): CreateProjectInput => ({
    name,
    basePath: '/',
    isPublic: false,
    settings: { cors: true, log_requests: false, global_headers: {} },
  });

  const totalProject = async (teamId: string) =>
    (await TeamMetadata.query().where('team_id', teamId).firstOrFail()).totalProject;

  test('company owner can create a team project; total_project increments', async ({ assert }) => {
    const { ownerUser, team } = await seed();
    const project = await ProjectService.createTeamProject(ownerUser.id, team.id, input('P1'));
    assert.equal(project.teamId, team.id);
    assert.equal(await totalProject(team.id), 1);
  });

  test('a team admin can create a team project', async ({ assert }) => {
    const { company, ownerProfile, team } = await seed();
    const admin = await addMember(company.id, { team, ownerProfile, teamRole: 'admin' });
    const project = await ProjectService.createTeamProject(admin.user.id, team.id, input('P2'));
    assert.equal(project.teamId, team.id);
  });

  test('a plain company member (not a team admin) cannot create a team project', async ({
    assert,
  }) => {
    const { company, team } = await seed();
    const member = await addMember(company.id);
    await assert.rejects(
      () => ProjectService.createTeamProject(member.user.id, team.id, input('P3')),
      /owner\/admin|team admin|forbidden/i
    );
  });

  test('a non-member cannot create a team project', async ({ assert }) => {
    const { team } = await seed();
    const stranger = await makeUser();
    await assert.rejects(
      () => ProjectService.createTeamProject(stranger.id, team.id, input('P4')),
      /owner\/admin|team admin|forbidden/i
    );
  });

  test('a team admin can delete a team project; total_project decrements', async ({ assert }) => {
    const { company, ownerProfile, ownerUser, team } = await seed();
    const admin = await addMember(company.id, { team, ownerProfile, teamRole: 'admin' });
    const project = await ProjectService.createTeamProject(ownerUser.id, team.id, input('P5'));
    assert.equal(await totalProject(team.id), 1);

    await ProjectService.deleteProject(project.id, admin.user.id);
    assert.equal(await totalProject(team.id), 0);
  });
});
