import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Profile from '#models/profile';
import type { ProfileRole } from '#models/profile';
import * as CompanyService from '#services/company_service';
import * as ProfileService from '#services/profile_service';

/**
 * Privilege-escalation guards on profile role/status changes. A regression here
 * is a real security hole (a member promoting themselves, an admin demoting the
 * owner, etc.), so the rank/owner/self rules are pinned down explicitly.
 */
test.group('profile escalation guards', (group) => {
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

  async function addProfile(companyId: string, role: ProfileRole) {
    const user = await makeUser();
    return Profile.create({
      userId: user.id,
      companyId,
      displayName: user.name,
      avatarUrl: null,
      role,
      status: 'active',
      visibility: 'company_member_only',
      joinedAt: DateTime.now(),
    });
  }

  test('a member cannot change roles', async ({ assert }) => {
    const { company } = await seedCompany();
    const actor = await addProfile(company.id, 'member');
    const target = await addProfile(company.id, 'member');
    await assert.rejects(
      () => ProfileService.changeRole(target.id, actor, 'admin'),
      /only admin or owner/i
    );
  });

  test('nobody can change their own role', async ({ assert }) => {
    const { company } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    await assert.rejects(
      () => ProfileService.changeRole(admin.id, admin, 'member'),
      /your own role/i
    );
  });

  test('the owner role cannot be assigned via changeRole', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const target = await addProfile(company.id, 'member');
    await assert.rejects(
      () => ProfileService.changeRole(target.id, ownerProfile, 'owner' as ProfileRole),
      /transferownership/i
    );
  });

  test('an admin cannot demote the owner', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    await assert.rejects(
      () => ProfileService.changeRole(ownerProfile.id, admin, 'member'),
      /demote the owner/i
    );
  });

  test('an admin cannot assign a role at or above their own', async ({ assert }) => {
    const { company } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    const target = await addProfile(company.id, 'member');
    await assert.rejects(
      () => ProfileService.changeRole(target.id, admin, 'admin'),
      /below your own/i
    );
  });

  test('an owner can promote a member to admin', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const target = await addProfile(company.id, 'member');
    const updated = await ProfileService.changeRole(target.id, ownerProfile, 'admin');
    assert.equal(updated.role, 'admin');
  });

  test('nobody can suspend themselves', async ({ assert }) => {
    const { company } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    await assert.rejects(() => ProfileService.suspendProfile(admin.id, admin), /suspend yourself/i);
  });

  test('the owner cannot be suspended', async ({ assert }) => {
    const { company, ownerProfile } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    await assert.rejects(
      () => ProfileService.suspendProfile(ownerProfile.id, admin),
      /suspend the owner/i
    );
  });
});
