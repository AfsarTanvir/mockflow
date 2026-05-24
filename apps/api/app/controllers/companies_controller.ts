import type { HttpContext } from '@adonisjs/core/http';
import { Exception } from '@adonisjs/core/exceptions';
import Company from '../models/company.js';
import CompanyMetadata from '../models/company_metadata.js';
import Profile from '../models/profile.js';
import {
  createCompanyValidator,
  updateCompanyValidator,
  transferOwnershipValidator,
} from '../validators/company_validator.js';
import * as CompanyService from '../services/company_service.js';

type ProfileRole = 'owner' | 'admin' | 'member' | 'viewer';
const ROLE_RANK: Record<ProfileRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Look up the requester's active profile in this company.
 * Returns null if unauthenticated, profile-less in this company, or inactive.
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
 * Public-facing landing-view shape. Safe for unauthenticated visitors of
 * protected / public companies.
 */
function landingView(company: Company, metadata: CompanyMetadata | null) {
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

/**
 * Full member-view shape. Includes everything plus the requester's own
 * role inside the company.
 */
function memberView(company: Company, metadata: CompanyMetadata | null, actor: Profile) {
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
  /*
  |--------------------------------------------------------------------------
  | Index - GET /api/companies   (auth required)
  | Lists the current user's active profiles' companies.
  |--------------------------------------------------------------------------
  */
  async index({ auth, response }: HttpContext) {
    const userId = auth.user!.id;

    const profiles = await Profile.query()
      .where('user_id', userId)
      .where('status', 'active')
      .preload('company')
      .orderBy('created_at', 'desc');

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

  /*
  |--------------------------------------------------------------------------
  | Store - POST /api/companies   (auth required)
  | Creates company + owner profile + metadata in one tx.
  |--------------------------------------------------------------------------
  */
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
      profile: {
        id: profile.id,
        role: profile.role,
        displayName: profile.displayName,
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Show - GET /api/companies/:slug   (public, visibility-gated)
  |   private    → must have an active profile in the company; else 404
  |   protected  → anyone sees landing view; members see full view
  |   public     → anyone sees landing view; members see full view
  |--------------------------------------------------------------------------
  */
  async show({ auth, params, response }: HttpContext) {
    const company = await Company.findBy('slug', params.slug);
    if (!company) return response.notFound({ message: 'Company not found' });

    // Best-effort authenticate. If no token / invalid token, userId stays null.
    let userId: string | null = null;
    try {
      await auth.check();
      userId = auth.user?.id ?? null;
    } catch {
      userId = null;
    }

    const actor = await findActorProfile(userId, company.id);
    const metadata = await CompanyMetadata.find(company.id);

    if (company.visibility === 'private') {
      // Private companies are invisible to non-members. Return 404 to hide existence.
      if (!actor) return response.notFound({ message: 'Company not found' });
      return response.ok(memberView(company, metadata, actor));
    }

    // protected / public — members get the full view, outsiders get the landing view
    if (actor) return response.ok(memberView(company, metadata, actor));
    return response.ok(landingView(company, metadata));
  }

  /*
  |--------------------------------------------------------------------------
  | Update - PUT /api/companies/:id   (auth required, owner/admin)
  |--------------------------------------------------------------------------
  */
  async update({ auth, params, request, response }: HttpContext) {
    const company = await Company.find(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await findActorProfile(auth.user!.id, company.id);
    if (!actor) return response.forbidden({ message: 'Access denied' });
    if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
      return response.forbidden({ message: 'Only admin or owner can update the company' });
    }

    const data = await request.validateUsing(updateCompanyValidator);

    try {
      const updated = await CompanyService.updateCompany(company.id, data);
      const metadata = await CompanyMetadata.find(company.id);
      return response.ok(memberView(updated, metadata, actor));
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Destroy - DELETE /api/companies/:id   (auth required, owner only)
  |--------------------------------------------------------------------------
  */
  async destroy({ auth, params, response }: HttpContext) {
    const company = await Company.find(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await findActorProfile(auth.user!.id, company.id);
    if (!actor || actor.role !== 'owner') {
      return response.forbidden({ message: 'Only the owner can delete the company' });
    }

    await CompanyService.deleteCompany(company.id);
    return response.ok({ message: 'Company deleted' });
  }

  /*
  |--------------------------------------------------------------------------
  | Transfer Ownership - POST /api/companies/:id/transfer-ownership
  | Owner only. Atomic role swap + companies.owner_user_id update.
  |--------------------------------------------------------------------------
  */
  async transferOwnership({ auth, params, request, response }: HttpContext) {
    const company = await Company.find(params.id);
    if (!company) return response.notFound({ message: 'Company not found' });

    const actor = await findActorProfile(auth.user!.id, company.id);
    if (!actor || actor.role !== 'owner') {
      return response.forbidden({ message: 'Only the owner can transfer ownership' });
    }

    const { newOwnerProfileId } = await request.validateUsing(transferOwnershipValidator);

    try {
      await CompanyService.transferOwnership(company.id, newOwnerProfileId);
      return response.ok({ message: 'Ownership transferred' });
    } catch (e) {
      if (e instanceof Exception) {
        return response.status(e.status).json({ message: e.message });
      }
      throw e;
    }
  }
}
