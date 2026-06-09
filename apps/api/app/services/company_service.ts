import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import User from '../models/user.js';
import Company from '../models/company.js';
import CompanyMetadata from '../models/company_metadata.js';
import Profile from '../models/profile.js';
import ProfileMetadata from '../models/profile_metadata.js';
import type { CompanyVisibility } from '../models/company.js';
import type { BillingAddress, CompanySettings } from '../models/company_metadata.js';
import { slugify } from './slug_helper.js';
import * as AvatarService from './avatar_service.js';
import type { MultipartFile } from '@adonisjs/core/bodyparser';

export interface CreateCompanyInput {
  name: string;
  visibility?: CompanyVisibility;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  sizeBucket?: string | null;
  billingEmail?: string | null;
  billingAddress?: BillingAddress | null;
  settings?: CompanySettings;
}

export interface CreateCompanyResult {
  company: Company;
  profile: Profile;
}

/**
 * Atomic creation:
 *   1. Resolve the creating user
 *   2. Insert the company row
 *   3. Insert company_metadata with total_member=1, total_team=0
 *   4. Insert the owner profile — display_name + avatar_url snapshotted from user
 *   5. Insert profile_metadata with empty defaults
 *
 * Returns the created company + owner profile. Any failure rolls back the whole tx.
 */
export async function createCompany(
  userId: string,
  input: CreateCompanyInput
): Promise<CreateCompanyResult> {
  return db.transaction(async (trx) => {
    const user = await User.find(userId, { client: trx });
    if (!user) throw new Exception('User not found', { status: 404 });

    const company = await Company.create(
      {
        name: input.name,
        slug: slugify(input.name),
        visibility: input.visibility ?? 'private',
        logoUrl: input.logoUrl ?? null,
        avatarUrl: input.avatarUrl ?? null,
        ownerUserId: user.id,
      },
      { client: trx }
    );

    await CompanyMetadata.create(
      {
        companyId: company.id,
        description: input.description ?? null,
        website: input.website ?? null,
        industry: input.industry ?? null,
        sizeBucket: input.sizeBucket ?? null,
        billingEmail: input.billingEmail ?? null,
        billingAddress: input.billingAddress ?? null,
        settings: input.settings ?? {},
        totalMember: 1,
        totalTeam: 0,
      },
      { client: trx }
    );

    const profile = await Profile.create(
      {
        userId: user.id,
        companyId: company.id,
        // Snapshot — never falls back to user.* at read time
        displayName: user.name,
        avatarUrl: user.avatarUrl,
        role: 'owner',
        status: 'active',
        visibility: 'company_member_only',
        joinedAt: DateTime.now(),
      },
      { client: trx }
    );

    await ProfileMetadata.create(
      {
        profileId: profile.id,
        links: [],
        preferences: {},
      },
      { client: trx }
    );

    return { company, profile };
  });
}

/**
 * Soft-update of company core fields + metadata in one tx.
 * Caller is expected to have already done the role check (owner / admin).
 */
export async function updateCompany(
  companyId: string,
  input: Partial<CreateCompanyInput>
): Promise<Company> {
  return db.transaction(async (trx) => {
    const company = await Company.find(companyId, { client: trx });
    if (!company) throw new Exception('Company not found', { status: 404 });

    company.useTransaction(trx);
    if (input.name !== undefined) company.name = input.name;
    if (input.visibility !== undefined) company.visibility = input.visibility;
    if (input.logoUrl !== undefined) company.logoUrl = input.logoUrl;
    if (input.avatarUrl !== undefined) company.avatarUrl = input.avatarUrl;
    await company.save();

    const metadata = await CompanyMetadata.find(companyId, { client: trx });
    if (metadata) {
      metadata.useTransaction(trx);
      if (input.description !== undefined) metadata.description = input.description;
      if (input.website !== undefined) metadata.website = input.website;
      if (input.industry !== undefined) metadata.industry = input.industry;
      if (input.sizeBucket !== undefined) metadata.sizeBucket = input.sizeBucket;
      if (input.billingEmail !== undefined) metadata.billingEmail = input.billingEmail;
      if (input.billingAddress !== undefined) metadata.billingAddress = input.billingAddress;
      if (input.settings !== undefined) metadata.settings = input.settings;
      await metadata.save();
    }

    return company;
  });
}

/** Replace a company's logo/avatar with a freshly uploaded image. Caller checks owner/admin. */
export async function setAvatarFromUpload(
  companyId: string,
  file: MultipartFile,
  baseUrl: string
): Promise<Company> {
  const company = await Company.find(companyId);
  if (!company) throw new Exception('Company not found', { status: 404 });

  const url = await AvatarService.storeUpload(file, baseUrl);
  const previous = company.avatarUrl;
  company.avatarUrl = url;
  await company.save();
  await AvatarService.deleteIfLocal(previous);
  return company;
}

/**
 * Hard-delete a company. Every linked row (profiles, metadata, etc.) cascades.
 * Caller checks that the actor is the owner.
 */
export async function deleteCompany(companyId: string): Promise<void> {
  /**
   * add auth verification by sending email before deleting company
   */
  const company = await Company.find(companyId);
  if (!company) throw new Exception('Company not found', { status: 404 });
  await company.delete();
}

/**
 * Atomic ownership transfer:
 *   1. Verify target is an active profile in this company
 *   2. Demote current owner to admin
 *   3. Promote target to owner
 *   4. Update companies.owner_user_id
 *
 * The partial UNIQUE (company_id) WHERE role='owner' serialises any race.
 */
export async function transferOwnership(
  companyId: string,
  newOwnerProfileId: string
): Promise<void> {
  await db.transaction(async (trx) => {
    const company = await Company.find(companyId, { client: trx });
    if (!company) throw new Exception('Company not found', { status: 404 });

    const newOwner = await Profile.find(newOwnerProfileId, { client: trx });
    if (!newOwner || newOwner.companyId !== companyId) {
      throw new Exception('Target profile not in this company', { status: 404 });
    }
    if (newOwner.status !== 'active') {
      throw new Exception('Target profile is not active', { status: 422 });
    }
    if (newOwner.role === 'owner') {
      throw new Exception('Target profile is already the owner', { status: 422 });
    }

    const currentOwner = await Profile.query({ client: trx })
      .where('company_id', companyId)
      .where('role', 'owner')
      .firstOrFail();

    /**
     * add auth verification by sending email(random code)
     */

    // To avoid violating the partial unique index, demote first then promote.
    currentOwner.useTransaction(trx);
    currentOwner.role = 'admin';
    await currentOwner.save();

    newOwner.useTransaction(trx);
    newOwner.role = 'owner';
    await newOwner.save();

    company.useTransaction(trx);
    company.ownerUserId = newOwner.userId;
    await company.save();
  });
}
