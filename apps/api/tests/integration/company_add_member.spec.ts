import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import testUtils from '@adonisjs/core/services/test_utils';
import User from '#models/user';
import Profile from '#models/profile';
import ProfileMetadata from '#models/profile_metadata';
import CompanyMetadata from '#models/company_metadata';
import type { ProfileRole } from '#models/profile';
import * as CompanyService from '#services/company_service';
import * as ProfileService from '#services/profile_service';

/**
 * Manually adding an existing user to a company (POST /api/companies/:id/profiles).
 * Pins the rank rules (no escalation), the duplicate/rejoin handling, and that
 * the company roster counter stays in step.
 */
test.group('company add member', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  let n = 0;
  const uniq = () => `${Date.now()}-${(n += 1)}-${Math.round(Math.random() * 1e6)}`;

  async function makeUser(email?: string) {
    const id = uniq();
    return User.create({
      name: `U ${id}`,
      email: email ?? `u-${id}@test.local`,
      password: 'secret12345',
      emailVerified: true,
    });
  }

  async function seedCompany() {
    const ownerUser = await makeUser();
    const { company, profile: owner } = await CompanyService.createCompany(ownerUser.id, {
      name: `Co ${uniq()}`,
    });
    return { company, owner };
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

  async function totalMember(companyId: string) {
    const meta = await CompanyMetadata.findOrFail(companyId);
    return meta.totalMember;
  }

  test('owner adds a user; role defaults to member and the roster grows', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const user = await makeUser();

    const profile = await ProfileService.addMember(company.id, owner, { email: user.email });

    assert.equal(profile.userId, user.id);
    assert.equal(profile.role, 'member');
    assert.equal(profile.status, 'active');
    assert.equal(profile.displayName, user.name);
    assert.isNotNull(await ProfileMetadata.find(profile.id));
    assert.equal(await totalMember(company.id), 2);
  });

  test('admin adds a viewer', async ({ assert }) => {
    const { company } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    const user = await makeUser();

    const profile = await ProfileService.addMember(company.id, admin, {
      email: user.email,
      role: 'viewer',
    });
    assert.equal(profile.role, 'viewer');
  });

  test('admin cannot add another admin; owner can', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const admin = await addProfile(company.id, 'admin');
    const user = await makeUser();

    await assert.rejects(
      () => ProfileService.addMember(company.id, admin, { email: user.email, role: 'admin' }),
      /role below your own/i
    );
    const profile = await ProfileService.addMember(company.id, owner, {
      email: user.email,
      role: 'admin',
    });
    assert.equal(profile.role, 'admin');
  });

  test('members and viewers cannot add anyone', async ({ assert }) => {
    const { company } = await seedCompany();
    const member = await addProfile(company.id, 'member');
    const user = await makeUser();

    await assert.rejects(
      () => ProfileService.addMember(company.id, member, { email: user.email }),
      /only admin or owner/i
    );
  });

  test('an actor from another company is rejected', async ({ assert }) => {
    const { company } = await seedCompany();
    const { owner: otherOwner } = await seedCompany();
    const user = await makeUser();

    await assert.rejects(
      () => ProfileService.addMember(company.id, otherOwner, { email: user.email }),
      /access denied/i
    );
  });

  test('unknown email is a 404, not a silent no-op', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    await assert.rejects(
      () => ProfileService.addMember(company.id, owner, { email: `nobody-${uniq()}@test.local` }),
      /no mockflow account/i
    );
    assert.equal(await totalMember(company.id), 1);
  });

  test('email lookup falls back to case-insensitive', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const user = await makeUser(`Mixed-${uniq()}@Test.Local`);

    const profile = await ProfileService.addMember(company.id, owner, {
      email: user.email.toLowerCase(),
    });
    assert.equal(profile.userId, user.id);
  });

  test('adding an active or suspended member is a conflict', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const user = await makeUser();
    const profile = await ProfileService.addMember(company.id, owner, { email: user.email });

    await assert.rejects(
      () => ProfileService.addMember(company.id, owner, { email: user.email }),
      /already a member/i
    );

    await ProfileService.suspendProfile(profile.id, owner);
    await assert.rejects(
      () => ProfileService.addMember(company.id, owner, { email: user.email }),
      /suspended/i
    );
    assert.equal(await totalMember(company.id), 2);
  });

  test('re-adding someone who left reactivates the same profile', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const user = await makeUser();
    const first = await ProfileService.addMember(company.id, owner, { email: user.email });
    await ProfileService.setInactive(first.id, owner, 'removed');
    assert.equal(await totalMember(company.id), 1);

    const again = await ProfileService.addMember(company.id, owner, {
      email: user.email,
      role: 'viewer',
    });

    assert.equal(again.id, first.id);
    assert.equal(again.status, 'active');
    assert.equal(again.role, 'viewer');
    assert.isNull(again.leftAt);
    assert.equal(await totalMember(company.id), 2);
  });

  test('owner role can never be granted this way', async ({ assert }) => {
    const { company, owner } = await seedCompany();
    const user = await makeUser();
    await assert.rejects(
      () =>
        ProfileService.addMember(company.id, owner, {
          email: user.email,
          role: 'owner' as never,
        }),
      /role below your own/i
    );
  });
});
