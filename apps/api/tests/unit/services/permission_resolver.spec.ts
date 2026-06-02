import { test } from '@japa/runner';
import {
  canActOnProject,
  canSeeTeam,
  canSeeProfile,
  type ProfileLike,
  type ProjectLike,
  type TeamLike,
  type CompanyLike,
  type TeamMembershipLike,
  type ProjectAction,
} from '#app/services/permission_resolver';

/* ------------------------------------------------------------------ */
/* Fixture factories                                                   */
/* ------------------------------------------------------------------ */

const C1 = 'c1';
const OTHER = 'c2';

function profile(overrides: Partial<ProfileLike>): ProfileLike {
  return {
    id: 'p1',
    companyId: C1,
    status: 'active',
    role: 'member',
    visibility: 'company_member_only',
    ...overrides,
  };
}

function project(overrides: Partial<ProjectLike>): ProjectLike {
  return { companyId: C1, teamId: null, ...overrides };
}

function team(overrides: Partial<TeamLike>): TeamLike {
  return { id: 't1', companyId: C1, visibility: 'private', ...overrides };
}

function company(overrides: Partial<CompanyLike>): CompanyLike {
  return { id: C1, visibility: 'private', ...overrides };
}

function membership(overrides: Partial<TeamMembershipLike>): TeamMembershipLike {
  return { profileId: 'p1', teamId: 't1', role: 'member', ...overrides };
}

/* ------------------------------------------------------------------ */
/* canActOnProject                                                     */
/* ------------------------------------------------------------------ */

test.group('permission_resolver / canActOnProject — sanity', () => {
  test('rejects when profile is in a different company', ({ assert }) => {
    const result = canActOnProject(profile({ companyId: OTHER }), project({}), null, 'read');
    assert.isFalse(result);
  });

  test('rejects when profile is suspended', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({ status: 'suspended' }), project({}), null, 'read'));
  });

  test('rejects when profile is inactive', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({ status: 'inactive' }), project({}), null, 'read'));
  });
});

test.group('permission_resolver / canActOnProject — owner bypass', () => {
  for (const action of ['read', 'write', 'delete'] as ProjectAction[]) {
    test(`owner can ${action} any project (including team-scoped without membership)`, ({
      assert,
    }) => {
      assert.isTrue(
        canActOnProject(profile({ role: 'owner' }), project({ teamId: 't1' }), null, action)
      );
    });
  }
});

test.group('permission_resolver / canActOnProject — admin bypass', () => {
  test('admin can delete team-scoped projects without team membership', ({ assert }) => {
    assert.isTrue(
      canActOnProject(profile({ role: 'admin' }), project({ teamId: 't1' }), null, 'delete')
    );
  });
});

test.group('permission_resolver / canActOnProject — viewer', () => {
  test('viewer can read company-scoped project', ({ assert }) => {
    assert.isTrue(canActOnProject(profile({ role: 'viewer' }), project({}), null, 'read'));
  });

  test('viewer cannot write', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({ role: 'viewer' }), project({}), null, 'write'));
  });

  test('viewer cannot delete', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({ role: 'viewer' }), project({}), null, 'delete'));
  });
});

test.group('permission_resolver / canActOnProject — member, team-scoped', () => {
  test('member without team membership cannot read team-scoped project', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({}), project({ teamId: 't1' }), null, 'read'));
  });

  test('member with team-member role can read team-scoped project', ({ assert }) => {
    assert.isTrue(canActOnProject(profile({}), project({ teamId: 't1' }), membership({}), 'read'));
  });

  test('member with team-member role can write team-scoped project', ({ assert }) => {
    assert.isTrue(canActOnProject(profile({}), project({ teamId: 't1' }), membership({}), 'write'));
  });

  test('member with team-member role cannot delete team-scoped project', ({ assert }) => {
    assert.isFalse(
      canActOnProject(profile({}), project({ teamId: 't1' }), membership({}), 'delete')
    );
  });

  test('member with team-admin role can delete team-scoped project', ({ assert }) => {
    assert.isTrue(
      canActOnProject(
        profile({}),
        project({ teamId: 't1' }),
        membership({ role: 'admin' }),
        'delete'
      )
    );
  });

  test('membership for a different team does not grant access', ({ assert }) => {
    assert.isFalse(
      canActOnProject(profile({}), project({ teamId: 't1' }), membership({ teamId: 't2' }), 'read')
    );
  });

  test('membership belonging to another profile does not grant access', ({ assert }) => {
    assert.isFalse(
      canActOnProject(
        profile({}),
        project({ teamId: 't1' }),
        membership({ profileId: 'someone-else' }),
        'read'
      )
    );
  });
});

test.group('permission_resolver / canActOnProject — member, company-scoped', () => {
  test('member can read company-scoped project', ({ assert }) => {
    assert.isTrue(canActOnProject(profile({}), project({}), null, 'read'));
  });

  test('member can write company-scoped project', ({ assert }) => {
    assert.isTrue(canActOnProject(profile({}), project({}), null, 'write'));
  });

  test('member cannot delete company-scoped project', ({ assert }) => {
    assert.isFalse(canActOnProject(profile({}), project({}), null, 'delete'));
  });
});

/* ------------------------------------------------------------------ */
/* canSeeTeam                                                          */
/* ------------------------------------------------------------------ */

test.group('permission_resolver / canSeeTeam — team members', () => {
  test('team member sees their team even if private', ({ assert }) => {
    assert.isTrue(canSeeTeam(profile({}), team({}), company({}), membership({})));
  });

  test('team member with admin role sees their team', ({ assert }) => {
    assert.isTrue(canSeeTeam(profile({}), team({}), company({}), membership({ role: 'admin' })));
  });
});

test.group('permission_resolver / canSeeTeam — same-company non-member', () => {
  test('cannot see a private team', ({ assert }) => {
    assert.isFalse(canSeeTeam(profile({}), team({ visibility: 'private' }), company({}), null));
  });

  test('sees a company_member_only team', ({ assert }) => {
    assert.isTrue(
      canSeeTeam(profile({}), team({ visibility: 'company_member_only' }), company({}), null)
    );
  });

  test('sees a public team (inside a private company)', ({ assert }) => {
    assert.isTrue(canSeeTeam(profile({}), team({ visibility: 'public' }), company({}), null));
  });

  test('suspended profile cannot see any team without membership', ({ assert }) => {
    assert.isFalse(
      canSeeTeam(
        profile({ status: 'suspended' }),
        team({ visibility: 'public' }),
        company({}),
        null
      )
    );
  });
});

test.group('permission_resolver / canSeeTeam — anonymous viewers', () => {
  test('public company + public team → visible', ({ assert }) => {
    assert.isTrue(
      canSeeTeam(null, team({ visibility: 'public' }), company({ visibility: 'public' }), null)
    );
  });

  test('public company + private team → hidden', ({ assert }) => {
    assert.isFalse(
      canSeeTeam(null, team({ visibility: 'private' }), company({ visibility: 'public' }), null)
    );
  });

  test('private company + public team → hidden (envelope wins)', ({ assert }) => {
    assert.isFalse(
      canSeeTeam(null, team({ visibility: 'public' }), company({ visibility: 'private' }), null)
    );
  });

  test('protected company + public team → hidden (envelope wins)', ({ assert }) => {
    assert.isFalse(
      canSeeTeam(null, team({ visibility: 'public' }), company({ visibility: 'protected' }), null)
    );
  });
});

/* ------------------------------------------------------------------ */
/* canSeeProfile                                                       */
/* ------------------------------------------------------------------ */

test.group('permission_resolver / canSeeProfile', () => {
  test('public profile visible to anonymous viewer', ({ assert }) => {
    assert.isTrue(canSeeProfile(null, profile({ visibility: 'public' })));
  });

  test('company_member_only profile NOT visible to anonymous viewer', ({ assert }) => {
    assert.isFalse(canSeeProfile(null, profile({ visibility: 'company_member_only' })));
  });

  test('company_member_only profile visible to active same-company member', ({ assert }) => {
    const viewer = profile({ id: 'p1' });
    const target = profile({ id: 'p2', visibility: 'company_member_only' });
    assert.isTrue(canSeeProfile(viewer, target));
  });

  test('company_member_only profile NOT visible to viewer in different company', ({ assert }) => {
    const viewer = profile({ id: 'p1', companyId: OTHER });
    const target = profile({ id: 'p2', visibility: 'company_member_only' });
    assert.isFalse(canSeeProfile(viewer, target));
  });

  test('company_member_only profile NOT visible to suspended viewer', ({ assert }) => {
    const viewer = profile({ id: 'p1', status: 'suspended' });
    const target = profile({ id: 'p2', visibility: 'company_member_only' });
    assert.isFalse(canSeeProfile(viewer, target));
  });

  test('public profile visible to suspended same-company viewer', ({ assert }) => {
    // visibility=public bypasses the active-membership check
    const viewer = profile({ id: 'p1', status: 'suspended' });
    const target = profile({ id: 'p2', visibility: 'public' });
    assert.isTrue(canSeeProfile(viewer, target));
  });
});
