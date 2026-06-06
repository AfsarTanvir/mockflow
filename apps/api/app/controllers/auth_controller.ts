import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as AuthService from '#services/auth_service';
import * as AdminAccessService from '#services/admin_access_service';
import type User from '#models/user';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '#validators/auth_validator';

/** Public profile shape returned on register/login. */
function sessionUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

/** Fuller account shape returned by /me and /profile. */
function accountUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export default class AuthController {
  /** POST /api/auth/register */
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator);
    const { user, token } = await AuthService.register(data);
    return response.created({
      message: 'Account created. Check your email to verify your address.',
      user: sessionUser(user),
      token,
    });
  }

  /** POST /api/auth/verify/:token (public) */
  async verifyEmail({ params, response }: HttpContext) {
    try {
      await AuthService.verifyEmail(params.token);
      return response.ok({ message: 'Email verified successfully' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/auth/resend-verification (protected) */
  async resendVerification({ auth, response }: HttpContext) {
    try {
      await AuthService.resendVerification(auth.user!);
      return response.ok({ message: 'Verification email sent' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/auth/forgot-password (public) */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator);
    try {
      await AuthService.forgotPassword(email);
      return response.ok({ message: 'Check your email for a reset link.' });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/auth/reset-password/:token (public) */
  async resetPassword({ params, request, response }: HttpContext) {
    const { newPassword } = await request.validateUsing(resetPasswordValidator);
    try {
      await AuthService.resetPassword(params.token, newPassword);
      return response.ok({
        message: 'Your password has been updated. You can now sign in with your new password.',
      });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/auth/login — verifyCredentials errors propagate to the global handler. */
  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);
    const { user, token } = await AuthService.login(email, password);
    return response.ok({ message: 'Login successful', user: sessionUser(user), token });
  }

  /** GET /api/auth/me (protected) */
  async me({ auth, response }: HttpContext) {
    const isSuperAdmin = await AdminAccessService.isSuperAdmin(auth.user!);
    return response.ok({ ...accountUser(auth.user!), isSuperAdmin });
  }

  /** PATCH /api/auth/profile (protected) */
  async updateProfile({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(updateProfileValidator);
    try {
      const user = await AuthService.updateProfile(auth.user!, data);
      return response.ok(accountUser(user));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** POST /api/auth/logout (protected) */
  async logout({ auth, response }: HttpContext) {
    await AuthService.revokeAccessToken(auth.user!, auth.user!.currentAccessToken.identifier);
    return response.ok({ message: 'Logged out successfully' });
  }

  /** POST /api/auth/refresh */
  async refresh({ auth, response }: HttpContext) {
    const user = await auth.authenticate();
    const token = await AuthService.issueAccessToken(user);
    return response.ok({ token });
  }
}
