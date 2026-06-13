import { randomBytes } from 'node:crypto';
import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import { Exception } from '@adonisjs/core/exceptions';
import type { Infer } from '@vinejs/vine/types';
import User from '#models/user';
import UserToken from '#models/user_token';
import * as UserQueries from '#queries/user_queries';
import * as UserTokenQueries from '#queries/user_token_queries';
import { sendVerificationEmail, sendPasswordResetEmail } from '#services/email_service';
import * as AvatarService from '#services/avatar_service';
import type { MultipartFile } from '@adonisjs/core/bodyparser';
import type { registerValidator, updateProfileValidator } from '#validators/auth_validator';

export type RegisterInput = Infer<typeof registerValidator>;
export type UpdateProfileInput = Infer<typeof updateProfileValidator>;

const VERIFY_TTL = { minutes: 10 };
const RESET_TTL = { hours: 1 };

export interface AuthResult {
  user: User;
  token: string;
}

/** Issue a fresh access token for a user, returning its plaintext value. */
export async function issueAccessToken(user: User): Promise<string> {
  const token = await User.accessTokens.create(user);
  return token.value!.release();
}

/** Revoke a single access token (logout). */
export async function revokeAccessToken(user: User, identifier: string | number | BigInt) {
  await User.accessTokens.delete(user, identifier);
}

/** Register a new user, issue a verification token (emailed), and sign them in. */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await UserQueries.findByEmail(input.email);
  if (existing) {
    throw new Exception('Email already registered', { status: 409, code: 'E_EMAIL_TAKEN' });
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    emailVerified: false,
  });

  const verificationToken = randomBytes(32).toString('hex');
  await UserToken.create({
    userId: user.id,
    type: 'verify_email',
    token: verificationToken,
    expiresAt: DateTime.now().plus(VERIFY_TTL),
  });

  sendVerificationEmail({ toEmail: user.email, userName: user.name, verificationToken }).catch(
    (err) => console.error('[MockFlow] Failed to send verification email on register:', err)
  );

  return { user, token: await issueAccessToken(user) };
}

/** Verify an email address from a verification token. */
export async function verifyEmail(token: string): Promise<void> {
  const record = await UserTokenQueries.findByTokenAndType(token, 'verify_email');
  if (!record) {
    throw new Exception('Invalid verification link', { status: 404, code: 'E_INVALID_TOKEN' });
  }
  if (record.expiresAt < DateTime.now()) {
    await record.delete();
    throw new Exception('Verification link has expired', { status: 422, code: 'E_TOKEN_EXPIRED' });
  }

  const user = await UserQueries.findById(record.userId);
  if (!user) {
    throw new Exception('User not found', { status: 404, code: 'E_USER_NOT_FOUND' });
  }

  user.emailVerified = true;
  await user.save();
  await record.delete();
}

/** Re-issue a verification email for the signed-in user (synchronous send). */
export async function resendVerification(user: User): Promise<void> {
  if (user.emailVerified) {
    throw new Exception('Email is already verified', { status: 422, code: 'E_ALREADY_VERIFIED' });
  }

  await UserTokenQueries.deleteForUserAndType(user.id, 'verify_email');

  const verificationToken = randomBytes(32).toString('hex');
  await UserToken.create({
    userId: user.id,
    type: 'verify_email',
    token: verificationToken,
    expiresAt: DateTime.now().plus(VERIFY_TTL),
  });

  try {
    await sendVerificationEmail({ toEmail: user.email, userName: user.name, verificationToken });
  } catch (err: unknown) {
    console.error('[MockFlow] Failed to resend verification email:', err);
    const message =
      (err instanceof Error && err.message) ||
      'Failed to send verification email. Check server logs.';
    throw new Exception(message, { status: 500, code: 'E_EMAIL_SEND_FAILED' });
  }
}

/** Start a password reset: issue a reset token and email it. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await UserQueries.findByEmail(email);
  // Never reveal whether an account exists — the controller returns the same
  // "check your email" response either way. Silently no-op for unknown emails.
  if (!user) return;

  await UserTokenQueries.deleteForUserAndType(user.id, 'reset_password');

  const resetToken = randomBytes(32).toString('hex');
  await UserToken.create({
    userId: user.id,
    type: 'reset_password',
    token: resetToken,
    expiresAt: DateTime.now().plus(RESET_TTL),
  });

  sendPasswordResetEmail({ toEmail: user.email, userName: user.name, resetToken }).catch((err) =>
    console.error('[MockFlow] Failed to send password reset email:', err)
  );
}

/** Complete a password reset and invalidate every existing session. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await UserTokenQueries.findByTokenAndType(token, 'reset_password');
  if (!record) {
    throw new Exception('This reset link is invalid or has already been used. Request a new one.', {
      status: 404,
      code: 'E_INVALID_TOKEN',
    });
  }
  if (record.expiresAt < DateTime.now()) {
    await record.delete();
    throw new Exception('This reset link has expired. Request a new one.', {
      status: 422,
      code: 'E_TOKEN_EXPIRED',
    });
  }

  const user = await UserQueries.findById(record.userId);
  if (!user) {
    throw new Exception('Account not found.', { status: 404, code: 'E_USER_NOT_FOUND' });
  }

  user.password = newPassword;
  await user.save();
  await record.delete();

  // Force re-login everywhere — drop all existing access tokens.
  const tokens = await User.accessTokens.all(user);
  await Promise.all(tokens.map((t) => User.accessTokens.delete(user, t.identifier)));
}

/** Verify credentials and issue an access token. */
export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await User.verifyCredentials(email, password);
  return { user, token: await issueAccessToken(user) };
}

/** Update the signed-in user's name and/or password. */
export async function updateProfile(user: User, input: UpdateProfileInput): Promise<User> {
  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new Exception('Current password is required to set a new password', {
        status: 422,
        code: 'E_CURRENT_PASSWORD_REQUIRED',
      });
    }
    const valid = await hash.verify(user.password ?? '', input.currentPassword);
    if (!valid) {
      throw new Exception('Current password is incorrect', {
        status: 422,
        code: 'E_CURRENT_PASSWORD_INVALID',
      });
    }
    const sameAsOld = await hash.verify(user.password ?? '', input.newPassword);
    if (sameAsOld) {
      throw new Exception('New password must be different from your current password', {
        status: 422,
        code: 'E_PASSWORD_UNCHANGED',
      });
    }
    user.password = input.newPassword;
  }

  if (input.name) {
    user.name = input.name;
  }

  // avatarUrl present (string=set external URL, null=clear). Clean up the prior
  // upload if it was stored locally and is being replaced/removed.
  let previousAvatar: string | null = null;
  if (input.avatarUrl !== undefined && input.avatarUrl !== user.avatarUrl) {
    previousAvatar = user.avatarUrl;
    user.avatarUrl = input.avatarUrl;
  }

  await user.save();
  if (previousAvatar) await AvatarService.deleteIfLocal(previousAvatar);
  return user;
}

/** Replace the user's avatar with a freshly uploaded image. */
export async function setAvatarFromUpload(
  user: User,
  file: MultipartFile,
  baseUrl: string
): Promise<User> {
  const url = await AvatarService.storeUpload(file, baseUrl);
  const previous = user.avatarUrl;
  user.avatarUrl = url;
  await user.save();
  await AvatarService.deleteIfLocal(previous);
  return user;
}
