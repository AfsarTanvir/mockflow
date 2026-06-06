import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import { respondError } from '#app/exceptions/respond_error';
import type Profile from '#models/profile';
import type ProfileMetadata from '#models/profile_metadata';
import * as ProfileQueries from '#queries/profile_queries';
import * as ProfileService from '#services/profile_service';
import { AVATAR_EXTNAMES, AVATAR_MAX_SIZE } from '#services/avatar_service';
import { updateProfileValidator, changeRoleValidator } from '#validators/profile_validator';

/** Safe card for outsiders when visibility = 'public'. Never exposes role/status/contact. */
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

/** Full view — for same-company members and the profile owner. */
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
  /** GET /api/companies/:companyId/profiles — members only. */
  async index({ auth, params, response }: HttpContext) {
    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, params.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const profiles = await ProfileQueries.listForCompanyWithMetadata(params.companyId);
    return response.ok(profiles.map((p) => fullView(p, p.metadata ?? null)));
  }

  /** GET /api/profiles/me?company=:id */
  async me({ auth, request, response }: HttpContext) {
    const companyId = request.input('company') as string | undefined;
    if (!companyId) return response.badRequest({ message: 'company query param required' });

    const profile = await ProfileQueries.findByUserAndCompanyWithMetadata(auth.user!.id, companyId);
    if (!profile) return response.notFound({ message: 'No profile in this company' });

    return response.ok(fullView(profile, profile.metadata ?? null));
  }

  /** GET /api/profiles/:id — public, visibility-gated. */
  async show({ auth, params, response }: HttpContext) {
    const profile = await ProfileQueries.findById(params.id);
    if (!profile) return response.notFound({ message: 'Profile not found' });

    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    const metadata = await ProfileQueries.findMetadata(profile.id);

    // The profile owner always sees their own full view.
    if (userId && profile.userId === userId) {
      return response.ok(fullView(profile, metadata));
    }

    // Public profile — anyone gets the safe card.
    if (profile.visibility === 'public') {
      return response.ok(publicCardView(profile, metadata));
    }

    // company_member_only — must be active in the same company.
    const actor = userId
      ? await ProfileQueries.findActiveByUserAndCompany(userId, profile.companyId)
      : null;
    if (!actor) return response.notFound({ message: 'Profile not found' });
    return response.ok(fullView(profile, metadata));
  }

  /** PATCH /api/profiles/:id — self-edit only. */
  async update({ auth, params, request, response }: HttpContext) {
    const profile = await ProfileQueries.findById(params.id);
    if (!profile) return response.notFound({ message: 'Profile not found' });

    if (profile.userId !== auth.user!.id) {
      return response.forbidden({ message: 'You can only edit your own profile' });
    }

    const data = await request.validateUsing(updateProfileValidator);
    try {
      const updated = await ProfileService.updateProfile(profile.id, data);
      const metadata = await ProfileQueries.findMetadata(updated.id);
      return response.ok(fullView(updated, metadata));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/profiles/:id/avatar — self only; multipart image upload. */
  async uploadAvatar({ auth, params, request, response }: HttpContext) {
    const profile = await ProfileQueries.findById(params.id);
    if (!profile) return response.notFound({ message: 'Profile not found' });

    if (profile.userId !== auth.user!.id) {
      return response.forbidden({ message: 'You can only edit your own profile' });
    }

    const file = request.file('avatar', { size: AVATAR_MAX_SIZE, extnames: AVATAR_EXTNAMES });
    try {
      if (!file) {
        throw new Exception('No image file provided', { status: 422, code: 'E_NO_FILE' });
      }
      const baseUrl = `${request.protocol()}://${request.host()}`;
      const updated = await ProfileService.setAvatarFromUpload(profile.id, file, baseUrl);
      const metadata = await ProfileQueries.findMetadata(updated.id);
      return response.ok(fullView(updated, metadata));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** PATCH /api/profiles/:id/role — admin+. */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const target = await ProfileQueries.findById(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    const { role } = await request.validateUsing(changeRoleValidator);
    try {
      const updated = await ProfileService.changeRole(target.id, actor, role);
      const metadata = await ProfileQueries.findMetadata(updated.id);
      return response.ok(fullView(updated, metadata));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/profiles/:id/suspend — admin+. */
  async suspend({ auth, params, response }: HttpContext) {
    const target = await ProfileQueries.findById(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.suspendProfile(target.id, actor);
      return response.ok({ id: updated.id, status: updated.status });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/profiles/:id/reactivate — admin+. */
  async reactivate({ auth, params, response }: HttpContext) {
    const target = await ProfileQueries.findById(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.reactivateProfile(target.id, actor);
      return response.ok({ id: updated.id, status: updated.status });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/profiles/:id/leave — self only. */
  async leave({ auth, params, response }: HttpContext) {
    const target = await ProfileQueries.findById(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.setInactive(target.id, actor, 'left');
      return response.ok({ id: updated.id, status: updated.status, leftAt: updated.leftAt });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/profiles/:id — admin+, soft-delete. */
  async destroy({ auth, params, response }: HttpContext) {
    const target = await ProfileQueries.findById(params.id);
    if (!target) return response.notFound({ message: 'Profile not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, target.companyId);
    if (!actor) return response.forbidden({ message: 'Access denied' });

    try {
      const updated = await ProfileService.setInactive(target.id, actor, 'removed');
      return response.ok({ id: updated.id, status: updated.status, leftAt: updated.leftAt });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
