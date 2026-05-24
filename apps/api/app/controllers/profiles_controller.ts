import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import Profile from '../models/profile.js';
import ProfileMetadata from '../models/profile_metadata.js';
import { updateProfileValidator, changeRoleValidator } from '../validators/profile_validator.js';
import * as ProfileService from '../services/profile_service.js';

/**
 * Look up the requester's active profile in a given company.
 * Returns null if unauthenticated, profile-less, or inactive.
 */
async function findActorProfile(userId: string | null, companyId: string): Promise<Profile | null> {
  if (!userId) return null;
  return Profile.query()
    .where('user_id', userId)
    .where('company_id', companyId)
    .where('status', 'active')
    .first();
}

/**
 * Safe profile card visible to outsiders when visibility = 'public'.
 * Never exposes role, status, email, phone, audit info.
 */
function publicCardView(profile: Profile, metadata: ProfileMetadata | null) {
  return {
    id: profile.id,
    companyId: profile.companyId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    visibility: profile.visibility,
    jobTitle: metadata?.jobTitle ?? null,
    department: metadata?.department ?? null,
    bio: metadata?.bio ?? null,
    links: metadata?.links ?? [],
  };
}

/**
 * Full profile view — visible to members of the same company AND to the
 * profile owner themselves.
 */
function fullView(profile: Profile, metadata: ProfileMetadata | null) {
  return {
    id: profile.id,
    userId: profile.userId,
    companyId: profile.companyId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    status: profile.status,
    visibility: profile.visibility,
    joinedAt: profile.joinedAt,
    leftAt: profile.leftAt,
    jobTitle: metadata?.jobTitle ?? null,
    department: metadata?.department ?? null,
    phone: metadata?.phone ?? null,
    bio: metadata?.bio ?? null,
    links: metadata?.links ?? [],
    preferences: metadata?.preferences ?? {},
    lastActiveAt: metadata?.lastActiveAt ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export default class ProfilesController {
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/companies/:companyId/profiles   (auth required)
  | Lists all profiles in the company. Caller must be a member.
  |--------------------------------------------------------------------------
  */
  async index({ auth, params, response }: HttpContext) {
    const actor = await findActorProfile(auth.user!.id, params.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const profiles = await Profile.query()
      .where('company_id', params.companyId)
      .preload('metadata')
      .orderBy('role', 'asc')
      .orderBy('created_at', 'asc');

    return response.ok(
      profiles.map((p) => fullView(p, p.metadata ?? null))
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Me - GET /api/profiles/me?company=:id   (auth required)
  | Returns the current user's profile in the given company, or 404.
  |--------------------------------------------------------------------------
  */
  async me({ auth, request, response }: HttpContext) {
    const companyId = request.input('company') as string | undefined;
    if (!companyId) return response.badRequest({ message: 'company query param required' });

    const profile = await Profile.query()
      .where('user_id', auth.user!.id)
      .where('company_id', companyId)
      .preload('metadata')
      .first();
    if (!profile) return response.notFound({ message: 'No profile in this company' });

    return response.ok(fullView(profile, profile.metadata ?? null));
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/profiles/:id   (public, visibility-gated)
  |   public                → safe card returned to anyone
  |   company_member_only   → full view to same-company members; 404 otherwise
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const profile = await Profile.find(params.id);
    if (!profile) return response.notFound({ message: 'Profile not found' });

    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    const metadata = await ProfileMetadata.find(profile.id);

    // Owner of the profile sees full view of self.
    if (userId && profile.userId === userId) {
      return response.ok(fullView(profile, metadata));
    }

    // Public profile — anyone gets the safe card.
    if (profile.visibility === 'public') {
      return response.ok(publicCardView(profile, metadata));
    }

    // company_member_only — must be active in same company.
    const actor = await findActorProfile(userId, profile.companyId);
    if (!actor) return response.notFound({ message: 'Profile not found' });
    return response.ok(fullView(profile, metadata));
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PATCH /api/profiles/:id   (auth required, self only)
  | Self-edit display_name / avatar / visibility / metadata fields.
  | Admins do NOT edit other profiles' display data — those are snapshots
  | owned by the user.
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const profile = await Profile.find(params.id);
    if (!profile) return response.notFound({ message: 'Profile not found' });

    if (profile.userId !== auth.user!.id) {
      return response.forbidden({ message: 'You can only edit your own profile' });
    }

    const data = await request.validateUsing(updateProfileValidator);

    try {
      const updated = await ProfileService.updateProfile(profile.id, data);
      const metadata = await ProfileMetadata.find(updated.id);
      return response.ok(fullView(updated, metadata));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Update role - PATCH /api/profiles/:id/role   (auth required, admin+)
  | Service enforces: no self-change, no owner assignment, rank-aware.
  |--------------------------------------------------------------------------
  */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const target = await Profile.find(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await findActorProfile(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const { role } = await request.validateUsing(changeRoleValidator);

    try {
      const updated = await ProfileService.changeRole(target.id, actor, role);
      const metadata = await ProfileMetadata.find(updated.id);
      return response.ok(fullView(updated, metadata));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Suspend - POST /api/profiles/:id/suspend   (auth required, admin+)
  |--------------------------------------------------------------------------
  */
  async suspend({ auth, params, response }: HttpContext) {
    const target = await Profile.find(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await findActorProfile(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.suspendProfile(target.id, actor);
      return response.ok({ id: updated.id, status: updated.status });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Reactivate - POST /api/profiles/:id/reactivate   (auth required, admin+)
  |--------------------------------------------------------------------------
  */
  async reactivate({ auth, params, response }: HttpContext) {
    const target = await Profile.find(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await findActorProfile(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.reactivateProfile(target.id, actor);
      return response.ok({ id: updated.id, status: updated.status });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Leave - POST /api/profiles/:id/leave   (auth required, self only)
  | Soft-delete via status='inactive'. Owner must transferOwnership first.
  |--------------------------------------------------------------------------
  */
  async leave({ auth, params, response }: HttpContext) {
    const target = await Profile.find(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await findActorProfile(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.setInactive(target.id, actor, 'left');
      return response.ok({ id: updated.id, status: updated.status, leftAt: updated.leftAt });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Remove - DELETE /api/profiles/:id   (auth required, admin+)
  | Soft-delete a different profile. Owner cannot be removed.
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const target = await Profile.find(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await findActorProfile(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.setInactive(target.id, actor, 'removed');
      return response.ok({ id: updated.id, status: updated.status, leftAt: updated.leftAt });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }
}
