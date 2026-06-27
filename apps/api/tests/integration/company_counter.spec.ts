import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Profile from '#models/profile';
import CompanyMetadata from '#models/company_metadata';
import * as CompanyService from '#services/company_service';
import * as ProfileService from '#services/profile_service';

/**
 * company_metadata.total_member is a denormalized roster count. Semantics:
 * a "member" is any profile that hasn't left (active or suspended), so leaving
 * (setInactive) decrements and rejoining (reactivate) increments, while
 * suspension does not change the count.
 */
test.group('company total_member counter', (group) => {
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

  async function seedCompany() {
    const ownerUser = await makeUser();
    const { company, profile: ownerProfile } = await CompanyService.createCompany(ownerUser.id, {
      name: `Co ${uniq()}`,
    });
    return { company, ownerProfile };
  }

  async function addActiveMember(companyId: string) {
    const user = await makeUser();
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

  const total = async (companyId: string) =>
    (await CompanyMetadata.query().where('company_id', companyId).firstOrFail()).totalMember;

  test('removing a member decrements, reactivating increments back', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const member = await addActiveMember(company.id);
    const before = await total(company.id);

    await ProfileService.setInactive(member.id, ownerProfile, 'removed');
    assert.equal(await total(company.id), before - 1);

    await ProfileService.reactivateProfile(member.id, ownerProfile);
    assert.equal(await total(company.id), before);
  });

  test('suspending a member leaves total_member unchanged', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const member = await addActiveMember(company.id);
    const before = await total(company.id);

    await ProfileService.suspendProfile(member.id, ownerProfile);
    assert.equal(await total(company.id), before);
  });
});
