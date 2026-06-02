import { randomBytes } from 'node:crypto';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import hash from '@adonisjs/core/services/hash';
import User from '../models/user.js';
import UserToken from '../models/user_token.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email_service.js';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/auth_validator.js';

export default class AuthController {
  /*
  |--------------------------------------------------------------------------
  | Register - POST /api/auth/register
  |--------------------------------------------------------------------------
  */
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator);

    const existingUser = await User.findBy('email', data.email);
    if (existingUser) {
      return response.conflict({ message: 'Email already registered' });
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      emailVerified: false,
    });

    const verificationToken = randomBytes(32).toString('hex');
    await UserToken.create({
      userId: user.id,
      type: 'verify_email',
      token: verificationToken,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    });

    sendVerificationEmail({
      toEmail: user.email,
      userName: user.name,
      verificationToken,
    }).catch((err) => {
      console.error('[MockFlow] Failed to send verification email on register:', err);
    });

    const token = await User.accessTokens.create(user);

    return response.created({
      message: 'Account created. Check your email to verify your address.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token: token.value!.release(),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Email - POST /api/auth/verify/:token (Public)
  |--------------------------------------------------------------------------
  */
  async verifyEmail({ params, response }: HttpContext) {
    const record = await UserToken.query()
      .where('token', params.token)
      .where('type', 'verify_email')
      .first();
    if (!record) return response.notFound({ message: 'Invalid verification link' });

    if (record.expiresAt < DateTime.now()) {
      await record.delete();
      return response.unprocessableEntity({ message: 'Verification link has expired' });
    }

    const user = await User.find(record.userId);
    if (!user) return response.notFound({ message: 'User not found' });

    user.emailVerified = true;
    await user.save();
    await record.delete();

    return response.ok({ message: 'Email verified successfully' });
  }

  /*
  |--------------------------------------------------------------------------
  | Resend Verification - POST /api/auth/resend-verification (Protected)
  |--------------------------------------------------------------------------
  */
  async resendVerification({ auth, response }: HttpContext) {
    const user = auth.user!;

    if (user.emailVerified) {
      return response.unprocessableEntity({ message: 'Email is already verified' });
    }

    await UserToken.query().where('user_id', user.id).where('type', 'verify_email').delete();

    const verificationToken = randomBytes(32).toString('hex');
    await UserToken.create({
      userId: user.id,
      type: 'verify_email',
      token: verificationToken,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    });

    try {
      await sendVerificationEmail({
        toEmail: user.email,
        userName: user.name,
        verificationToken,
      });
    } catch (err: any) {
      console.error('[MockFlow] Failed to resend verification email:', err);
      return response.internalServerError({
        message: err?.message ?? 'Failed to send verification email. Check server logs.',
      });
    }

    return response.ok({ message: 'Verification email sent' });
  }

  /*
  |--------------------------------------------------------------------------
  | Forgot Password - POST /api/auth/forgot-password (Public)
  |--------------------------------------------------------------------------
  */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator);

    const user = await User.findBy('email', email);
    if (!user) {
      return response.notFound({
        message: 'No account exists with that email. Please sign up first.',
      });
    }

    await UserToken.query().where('user_id', user.id).where('type', 'reset_password').delete();

    const resetToken = randomBytes(32).toString('hex');
    await UserToken.create({
      userId: user.id,
      type: 'reset_password',
      token: resetToken,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    });

    sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetToken,
    }).catch((err) => {
      console.error('[MockFlow] Failed to send password reset email:', err);
    });

    return response.ok({ message: 'Check your email for a reset link.' });
  }

  /*
  |--------------------------------------------------------------------------
  | Reset Password - POST /api/auth/reset-password/:token (Public)
  |--------------------------------------------------------------------------
  */
  async resetPassword({ params, request, response }: HttpContext) {
    const { newPassword } = await request.validateUsing(resetPasswordValidator);

    const record = await UserToken.query()
      .where('token', params.token)
      .where('type', 'reset_password')
      .first();
    if (!record) {
      return response.notFound({
        message: 'This reset link is invalid or has already been used. Request a new one.',
      });
    }

    if (record.expiresAt < DateTime.now()) {
      await record.delete();
      return response.unprocessableEntity({
        message: 'This reset link has expired. Request a new one.',
      });
    }

    const user = await User.find(record.userId);
    if (!user) return response.notFound({ message: 'Account not found.' });

    user.password = newPassword;
    await user.save();
    await record.delete();

    // Invalidate all existing access tokens for this user — force re-login everywhere
    await User.accessTokens
      .all(user)
      .then((tokens) =>
        Promise.all(tokens.map((t) => User.accessTokens.delete(user, t.identifier)))
      );

    return response.ok({
      message: 'Your password has been updated. You can now sign in with your new password.',
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Login - POST /api/auth/login
  |--------------------------------------------------------------------------
  */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);

    const user = await User.verifyCredentials(email, password);
    const token = await User.accessTokens.create(user);

    return response.ok({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token: token.value!.release(),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Me - GET /api/auth/me (Protected)
  |--------------------------------------------------------------------------
  */
  async me({ auth, response }: HttpContext) {
    const user = auth.user!;

    return response.ok({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update Profile - PATCH /api/auth/profile (Protected)
  |--------------------------------------------------------------------------
  */
  async updateProfile({ auth, request, response }: HttpContext) {
    const user = auth.user!;
    const data = await request.validateUsing(updateProfileValidator);

    if (data.newPassword) {
      if (!data.currentPassword) {
        return response.unprocessableEntity({
          message: 'Current password is required to set a new password',
        });
      }
      const valid = await hash.verify(user.password ?? '', data.currentPassword);
      if (!valid) {
        return response.unprocessableEntity({ message: 'Current password is incorrect' });
      }
      const sameAsOld = await hash.verify(user.password ?? '', data.newPassword);
      if (sameAsOld) {
        return response.unprocessableEntity({
          message: 'New password must be different from your current password',
        });
      }
      user.password = data.newPassword;
    }

    if (data.name) user.name = data.name;

    await user.save();

    return response.ok({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Logout - POST /api/auth/logout (Protected)
  |--------------------------------------------------------------------------
  */
  async logout({ auth, response }: HttpContext) {
    await User.accessTokens.delete(auth.user!, auth.user!.currentAccessToken.identifier);

    return response.ok({ message: 'Logged out successfully' });
  }

  /*
  |--------------------------------------------------------------------------
  | Refresh - POST /api/auth/refresh (Optional - tokens auto-handle this)
  |--------------------------------------------------------------------------
  */
  async refresh({ auth, response }: HttpContext) {
    const user = await auth.authenticate();
    const token = await User.accessTokens.create(user);

    return response.ok({
      token: token.value!.release(),
    });
  }
}
