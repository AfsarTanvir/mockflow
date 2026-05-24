import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import { Exception } from '@adonisjs/core/exceptions';
import Profile from '../models/profile.js';
import ProfileMetadata from '../models/profile_metadata.js';
import type { ProfileRole, ProfileVisibility } from '../models/profile.js';
import type { ProfileLink, ProfilePreferences } from '../models/profile_metadata.js';

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
  return db.transaction(async (trx) => {
    const profile = await Profile.find(profileId, { client: trx });
    if (!profile) throw new Exception('Profile not found', { status: 404 });

    profile.useTransaction(trx);
    if (input.displayName !== undefined) profile.displayName = input.displayName;
    if (input.avatarUrl !== undefined) profile.avatarUrl = input.avatarUrl;
    if (input.visibility !== undefined) profile.visibility = input.visibility;
    await profile.save();

    const metadata = await ProfileMetadata.find(profile.id, { client: trx });
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

    return profile;
  });
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

export async function reactivateProfile(
  targetProfileId: string,
  actor: Profile
): Promise<Profile> {
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
  target.status = 'active';
  target.leftAt = null;
  if (!target.joinedAt) target.joinedAt = DateTime.now();
  await target.save();
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

  await db.transaction(async (trx) => {
    target.useTransaction(trx);
    target.status = 'inactive';
    target.leftAt = DateTime.now();
    await target.save();

    // TODO (Week 6): delete all team_memberships for this profile inside this tx.
    // Schema doesn't exist yet — leaving the call site marked.
  });

  return target;
}
