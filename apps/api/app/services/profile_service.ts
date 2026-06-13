import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import Profile from '../models/profile.js';
import ProfileMetadata from '../models/profile_metadata.js';
import CompanyMetadata from '../models/company_metadata.js';
import type { ProfileRole, ProfileVisibility } from '../models/profile.js';
import type { ProfileLink, ProfilePreferences } from '../models/profile_metadata.js';
import { cleanupForInactiveProfile } from './team_membership_service.js';
import * as AvatarService from './avatar_service.js';
import type { MultipartFile } from '@adonisjs/core/bodyparser';

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  visibility?: ProfileVisibility;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  bio?: string | null;
  links?: ProfileLink[];
  preferences?: ProfilePreferences;
}

const ROLE_RANK: Record<ProfileRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/**
 * Edit profile core fields + metadata in one tx.
 * Caller is expected to have validated the actor either IS the target
 * or has admin+ permissions.
 */
export async function updateProfile(
  profileId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  let previousAvatar: string | null = null;
  const profile = await db.transaction(async (trx) => {
    const found = await Profile.find(profileId, { client: trx });
    if (!found) throw new Exception('Profile not found', { status: 404 });

    found.useTransaction(trx);
    if (input.displayName !== undefined) found.displayName = input.displayName;
    if (input.avatarUrl !== undefined && input.avatarUrl !== found.avatarUrl) {
      previousAvatar = found.avatarUrl;
      found.avatarUrl = input.avatarUrl;
    }
    if (input.visibility !== undefined) found.visibility = input.visibility;
    await found.save();

    const metadata = await ProfileMetadata.find(found.id, { client: trx });
    if (metadata) {
      metadata.useTransaction(trx);
      if (input.jobTitle !== undefined) metadata.jobTitle = input.jobTitle;
      if (input.department !== undefined) metadata.department = input.department;
      if (input.phone !== undefined) metadata.phone = input.phone;
      if (input.bio !== undefined) metadata.bio = input.bio;
      if (input.links !== undefined) metadata.links = input.links;
      if (input.preferences !== undefined) metadata.preferences = input.preferences;
      await metadata.save();
    }

    return found;
  });

  // Clean up the previous upload (if local) once the change is committed.
  if (previousAvatar) await AvatarService.deleteIfLocal(previousAvatar);
  return profile;
}

/** Replace a profile's avatar with a freshly uploaded image. */
export async function setAvatarFromUpload(
  profileId: string,
  file: MultipartFile,
  baseUrl: string
): Promise<Profile> {
  const profile = await Profile.find(profileId);
  if (!profile) throw new Exception('Profile not found', { status: 404 });

  const url = await AvatarService.storeUpload(file, baseUrl);
  const previous = profile.avatarUrl;
  profile.avatarUrl = url;
  await profile.save();
  await AvatarService.deleteIfLocal(previous);
  return profile;
}

/**
 * Change another profile's role. Admin+ only, and the actor must outrank both
 * the target's current role AND the target role being assigned. Owner role can
 * never be assigned via this path — use transferOwnership instead.
 */
export async function changeRole(
  targetProfileId: string,
  actorProfile: Profile,
  newRole: ProfileRole
): Promise<Profile> {
  if (newRole === 'owner') {
    throw new Exception('Use transferOwnership to assign the owner role', { status: 422 });
  }
  if (ROLE_RANK[actorProfile.role] < ROLE_RANK.admin) {
    throw new Exception('Only admin or owner can change roles', { status: 403 });
  }
  // Nobody can change their own role — prevents self-demotion (and self-promotion).
  // Owners must use transferOwnership to step down.
  if (actorProfile.id === targetProfileId) {
    throw new Exception('You cannot change your own role', { status: 403 });
  }

  const target = await Profile.find(targetProfileId);
  if (!target) throw new Exception('Profile not found', { status: 404 });
  if (target.companyId !== actorProfile.companyId) {
    throw new Exception('Profile is in a different company', { status: 403 });
  }
  if (target.role === 'owner') {
    throw new Exception('Cannot demote the owner directly. Use transferOwnership.', {
      status: 422,
    });
  }
  if (ROLE_RANK[actorProfile.role] <= ROLE_RANK[target.role]) {
    throw new Exception('You can only change roles below your own', { status: 403 });
  }
  if (ROLE_RANK[actorProfile.role] <= ROLE_RANK[newRole]) {
    throw new Exception('You can only assign roles below your own', { status: 403 });
  }

  target.role = newRole;
  await target.save();
  return target;
}

export async function suspendProfile(targetProfileId: string, actor: Profile): Promise<Profile> {
  if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Exception('Only admin or owner can suspend profiles', { status: 403 });
  }
  // Nobody suspends themselves. Self-leave goes through setInactive(reason='left').
  if (actor.id === targetProfileId) {
    throw new Exception('You cannot suspend yourself', { status: 403 });
  }
  const target = await Profile.find(targetProfileId);
  if (!target) throw new Exception('Profile not found', { status: 404 });
  if (target.companyId !== actor.companyId) {
    throw new Exception('Profile is in a different company', { status: 403 });
  }
  if (target.role === 'owner') {
    throw new Exception('Cannot suspend the owner', { status: 422 });
  }
  if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
    throw new Exception('Cannot suspend a profile at or above your role', { status: 403 });
  }
  target.status = 'suspended';
  await target.save();
  return target;
}

export async function reactivateProfile(targetProfileId: string, actor: Profile): Promise<Profile> {
  if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Exception('Only admin or owner can reactivate profiles', { status: 403 });
  }
  const target = await Profile.find(targetProfileId);
  if (!target) throw new Exception('Profile not found', { status: 404 });
  if (target.companyId !== actor.companyId) {
    throw new Exception('Profile is in a different company', { status: 403 });
  }

  // Reactivation flips status to 'active'.
  // Profile.displayName + avatarUrl are NOT re-snapshotted — prior customisation
  // is preserved. See COMPANY-WORKSPACE-MODEL.md "Policy decisions".
  const wasInactive = target.status === 'inactive';
  await db.transaction(async (trx) => {
    target.useTransaction(trx);
    target.status = 'active';
    target.leftAt = null;
    if (!target.joinedAt) target.joinedAt = DateTime.now();
    await target.save();

    // total_member counts current members (anyone not 'inactive'). Only a
    // rejoin from 'inactive' grows the roster; reactivating a suspended member
    // doesn't (they were already counted).
    if (wasInactive) {
      await CompanyMetadata.query({ client: trx })
        .where('company_id', target.companyId)
        .increment('total_member', 1);
    }
  });
  return target;
}

/**
 * Self-leave OR admin-remove. Both flip status to 'inactive' and stamp left_at.
 * On Week 6 this will also delete the profile's team_memberships in the same tx
 * (the team_memberships table doesn't exist yet, so the cleanup is a no-op TODO).
 */
export async function setInactive(
  targetProfileId: string,
  actor: Profile,
  reason: 'left' | 'removed' = 'removed'
): Promise<Profile> {
  const target = await Profile.find(targetProfileId);
  if (!target) throw new Exception('Profile not found', { status: 404 });
  if (target.companyId !== actor.companyId) {
    throw new Exception('Profile is in a different company', { status: 403 });
  }

  if (reason === 'left') {
    // Self-leave: actor must be the target. Owner cannot self-leave — transfer first.
    if (actor.id !== target.id) {
      throw new Exception('Use removed reason when acting on another profile', { status: 403 });
    }
    if (target.role === 'owner') {
      throw new Exception('Owner must transfer ownership before leaving', { status: 422 });
    }
  } else {
    // Removed by admin/owner: actor must outrank the target.
    if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
      throw new Exception('Only admin or owner can remove profiles', { status: 403 });
    }
    if (target.role === 'owner') {
      throw new Exception('Cannot remove the owner', { status: 422 });
    }
    if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
      throw new Exception('Cannot remove a profile at or above your role', { status: 403 });
    }
  }

  // Only decrement the company roster if they were still a member (guards
  // against a repeated remove double-counting).
  const wasMember = target.status !== 'inactive';
  await db.transaction(async (trx) => {
    target.useTransaction(trx);
    target.status = 'inactive';
    target.leftAt = DateTime.now();
    await target.save();

    // Cascade: drop every team_membership and decrement each affected team's counter
    await cleanupForInactiveProfile(target.id, trx);

    if (wasMember) {
      await CompanyMetadata.query({ client: trx })
        .where('company_id', target.companyId)
        .decrement('total_member', 1);
    }
  });

  return target;
}
