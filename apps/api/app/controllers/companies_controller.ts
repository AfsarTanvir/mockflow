import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import { respondError } from '#app/exceptions/respond_error';
import { AVATAR_EXTNAMES, AVATAR_MAX_SIZE } from '#services/avatar_service';
import type Company from '#models/company';
import type CompanyMetadata from '#models/company_metadata';
import type Profile from '#models/profile';
import * as CompanyQueries from '#queries/company_queries';
import * as ProfileQueries from '#queries/profile_queries';
import * as CompanyService from '#services/company_service';
import * as cache from '#services/cache_service';
import { cacheKeys } from '#services/cache_keys';
import {
  createCompanyValidator,
  updateCompanyValidator,
  transferOwnershipValidator,
} from '#validators/company_validator';
import { ROLE_RANK } from '#services/role_rank';

// Viewer-independent company data, cacheable by slug. The per-viewer shaping
// (landing vs member) happens outside the cache from this record + the actor.
interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  visibility: Company['visibility'];
  logoUrl: string | null;
  avatarUrl: string | null;
  ownerUserId: string;
  createdAt: string | null;
  updatedAt: string | null;
}
interface CompanyMetaRecord {
  description: string | null;
  website: string | null;
  industry: CompanyMetadata['industry'];
  sizeBucket: CompanyMetadata['sizeBucket'];
  totalMember: number;
  totalTeam: number;
  billingEmail: string | null;
  billingAddress: CompanyMetadata['billingAddress'];
  settings: CompanyMetadata['settings'];
}

function toCompanyRecord(c: Company): CompanyRecord {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    visibility: c.visibility,
    logoUrl: c.logoUrl,
    avatarUrl: c.avatarUrl,
    ownerUserId: c.ownerUserId,
    createdAt: c.createdAt?.toISO() ?? null,
    updatedAt: c.updatedAt?.toISO() ?? null,
  };
}
function toMetaRecord(m: CompanyMetadata | null): CompanyMetaRecord | null {
  if (!m) return null;
  return {
    description: m.description,
    website: m.website,
    industry: m.industry,
    sizeBucket: m.sizeBucket,
    totalMember: m.totalMember,
    totalTeam: m.totalTeam,
    billingEmail: m.billingEmail,
    billingAddress: m.billingAddress,
    settings: m.settings,
  };
}

/** Public-facing landing view — safe for unauthenticated visitors of protected/public companies. */
function landingView(company: CompanyRecord, metadata: CompanyMetaRecord | null) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    visibility: company.visibility,
    logoUrl: company.logoUrl,
    avatarUrl: company.avatarUrl,
    description: metadata?.description ?? null,
    website: metadata?.website ?? null,
    industry: metadata?.industry ?? null,
    sizeBucket: metadata?.sizeBucket ?? null,
    totalMember: metadata?.totalMember ?? 0,
    totalTeam: metadata?.totalTeam ?? 0,
    createdAt: company.createdAt,
  };
}

/** Full member view — everything plus the requester's own role. */
function memberView(company: CompanyRecord, metadata: CompanyMetaRecord | null, actor: Profile) {
  return {
    ...landingView(company, metadata),
    billingEmail: metadata?.billingEmail ?? null,
    billingAddress: metadata?.billingAddress ?? null,
    settings: metadata?.settings ?? {},
    ownerUserId: company.ownerUserId,
    updatedAt: company.updatedAt,
    currentUserRole: actor.role,
    currentProfileId: actor.id,
  };
}

export default class CompaniesController {
  /** GET /api/companies — the current user's companies (via active profiles). */
  async index({ auth, response }: HttpContext) {
    const profiles = await ProfileQueries.listActiveForUserWithCompany(auth.user!.id);

    return response.ok(
      profiles.map((p) => ({
        company: {
          id: p.company.id,
          name: p.company.name,
          slug: p.company.slug,
          visibility: p.company.visibility,
          logoUrl: p.company.logoUrl,
          avatarUrl: p.company.avatarUrl,
        },
        profile: {
          id: p.id,
          role: p.role,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          status: p.status,
        },
      }))
    );
  }

  /** POST /api/companies — creates company + owner profile + metadata in one tx. */
  async store({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(createCompanyValidator);
    const { company, profile } = await CompanyService.createCompany(auth.user!.id, data);

    return response.created({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        visibility: company.visibility,
        logoUrl: company.logoUrl,
        avatarUrl: company.avatarUrl,
      },
      profile: { id: profile.id, role: profile.role, displayName: profile.displayName },
    });
  }

  /** GET /api/companies/:slug — public, visibility-gated. */
  async show({ auth, params, response }: HttpContext) {
    // The company row + metadata are viewer-independent → cache them by slug.
    const data = await cache.remember<{
      company: CompanyRecord;
      metadata: CompanyMetaRecord | null;
    } | null>(cacheKeys.company(params.slug), cache.CACHE_TTL.entity, async () => {
      const company = await CompanyQueries.findBySlug(params.slug);
      if (!company) return null;
      const metadata = await CompanyQueries.findMetadata(company.id);
      return { company: toCompanyRecord(company), metadata: toMetaRecord(metadata) };
    });
    if (!data) return response.notFound({ message: 'Company not found' });

    // Best-effort authenticate; stay anonymous on missing/invalid token.
    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    // Per-viewer membership is resolved fresh (not cached) and drives the shape.
    const actor = userId
      ? await ProfileQueries.findActiveByUserAndCompany(userId, data.company.id)
      : null;

    if (data.company.visibility === 'private') {
      // Hide existence from non-members.
      if (!actor) return response.notFound({ message: 'Company not found' });
      return response.ok(memberView(data.company, data.metadata, actor));
    }

    if (actor) return response.ok(memberView(data.company, data.metadata, actor));
    return response.ok(landingView(data.company, data.metadata));
  }

  /** PUT /api/companies/:id — owner/admin. */
  async update({ auth, params, request, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });
    if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
      return response.forbidden({ message: 'Only admin or owner can update the company' });
    }

    const data = await request.validateUsing(updateCompanyValidator);
    try {
      const updated = await CompanyService.updateCompany(company.id, data);
      await cache.invalidateCompany(updated.slug);
      const metadata = await CompanyQueries.findMetadata(company.id);
      return response.ok(memberView(toCompanyRecord(updated), toMetaRecord(metadata), actor));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/companies/:id/avatar — owner/admin; multipart logo/avatar upload. */
  async uploadAvatar({ auth, params, request, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor || ROLE_RANK[actor.role] < ROLE_RANK.admin) {
      return response.forbidden({ message: 'Only admin or owner can change the company logo' });
    }

    const file = request.file('avatar', { size: AVATAR_MAX_SIZE, extnames: AVATAR_EXTNAMES });
    try {
      if (!file) {
        throw new Exception('No image file provided', { status: 422, code: 'E_NO_FILE' });
      }
      const baseUrl = `${request.protocol()}://${request.host()}`;
      const updated = await CompanyService.setAvatarFromUpload(company.id, file, baseUrl);
      await cache.invalidateCompany(updated.slug);
      const metadata = await CompanyQueries.findMetadata(company.id);
      return response.ok(memberView(toCompanyRecord(updated), toMetaRecord(metadata), actor));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/companies/:id — owner only. */
  async destroy({ auth, params, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor || actor.role !== 'owner') {
      return response.forbidden({ message: 'Only the owner can delete the company' });
    }

    await CompanyService.deleteCompany(company.id);
    await cache.invalidateCompany(company.slug);
    return response.ok({ message: 'Company deleted' });
  }

  /** POST /api/companies/:id/transfer-ownership — owner only. */
  async transferOwnership({ auth, params, request, response }: HttpContext) {
    const company = await CompanyQueries.findById(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await ProfileQueries.findActiveByUserAndCompany(auth.user!.id, company.id);
    if (!actor || actor.role !== 'owner') {
      return response.forbidden({ message: 'Only the owner can transfer ownership' });
    }

    const { newOwnerProfileId } = await request.validateUsing(transferOwnershipValidator);
    try {
      await CompanyService.transferOwnership(company.id, newOwnerProfileId);
      await cache.invalidateCompany(company.slug);
      return response.ok({ message: 'Ownership transferred' });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
