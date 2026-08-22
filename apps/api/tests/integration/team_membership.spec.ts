import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Profile from '#models/profile';
import TeamMetadata from '#models/team_metadata';
import * as CompanyService from '#services/company_service';
import * as TeamService from '#services/team_service';
import * as TeamMembershipService from '#services/team_membership_service';

/**
 * Two regression-prone invariants in the workspace-team domain:
 *  - a team must always keep at least one admin (the last-admin guard), and
 *  - team_metadata.total_member tracks add/remove exactly.
 */
test.group('team membership: last-admin guard + member counter', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function seedCompany() {
    const id = uniq();
    const owner = await User.create({
      name: `Owner ${id}`,
      email: `owner-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    const { company, profile: ownerProfile } = await CompanyService.createCompany(owner.id, {
      name: `Co ${id}`,
    });
    return { company, ownerProfile };
  }

  async function addCompanyProfile(companyId: string) {
    const id = uniq();
    const user = await User.create({
      name: `Member ${id}`,
      email: `member-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
    return Profile.create({
      userId: user.id,
      companyId,
      displayName: user.name,
      avatarUrl: null,
      role: 'member',
      status: 'active',
      visibility: 'company_member_only',
      joinedAt: DateTime.now(),
    });
  }

  const totalMember = async (teamId: string) =>
    (await TeamMetadata.query().where('team_id', teamId).firstOrFail()).totalMember;

  test('removing the only admin is blocked', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const team = await TeamService.createTeam(company.id, ownerProfile.id, { name: `T ${uniq()}` });
    const admin = await addCompanyProfile(company.id);
    await TeamMembershipService.addMember(team, ownerProfile, admin.id, 'admin');

    await assert.rejects(
      () => TeamMembershipService.removeMember(team, ownerProfile, admin.id),
      /at least one admin/i
    );
  });

  test('demoting the only admin is blocked', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const team = await TeamService.createTeam(company.id, ownerProfile.id, { name: `T ${uniq()}` });
    const admin = await addCompanyProfile(company.id);
    await TeamMembershipService.addMember(team, ownerProfile, admin.id, 'admin');

    await assert.rejects(
      () => TeamMembershipService.changeRole(team, ownerProfile, admin.id, 'member'),
      /at least one admin/i
    );
  });

  test('an admin can be removed while another admin remains', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const team = await TeamService.createTeam(company.id, ownerProfile.id, { name: `T ${uniq()}` });
    const a1 = await addCompanyProfile(company.id);
    const a2 = await addCompanyProfile(company.id);
    await TeamMembershipService.addMember(team, ownerProfile, a1.id, 'admin');
    await TeamMembershipService.addMember(team, ownerProfile, a2.id, 'admin');

    await TeamMembershipService.removeMember(team, ownerProfile, a1.id);
    assert.equal(await totalMember(team.id), 1);
  });

  test('total_member increments on add and decrements on remove', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const team = await TeamService.createTeam(company.id, ownerProfile.id, { name: `T ${uniq()}` });
    assert.equal(await totalMember(team.id), 0);

    const member = await addCompanyProfile(company.id);
    await TeamMembershipService.addMember(team, ownerProfile, member.id, 'member');
    assert.equal(await totalMember(team.id), 1);

    await TeamMembershipService.removeMember(team, ownerProfile, member.id);
    assert.equal(await totalMember(team.id), 0);
  });
});
