import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import { isSuperAdmin } from '#services/admin_access_service';

/**
 * Gate for /api/admin/* — must run AFTER `auth` (relies on ctx.auth.user).
 * Returns a uniform 403 whether the user simply isn't a super-admin or the
 * master company is unconfigured, so we never disclose the platform's setup.
 */
export default class SuperAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user;
    if (!user) {
      return ctx.response.unauthorized({ message: 'Authentication required' });
    }
    if (!(await isSuperAdmin(user))) {
      return ctx.response.forbidden({ message: 'Super-admin access required' });
    }
    return next();
  }
}
