import type { HttpContext } from '@adonisjs/core/http';
import { respondError } from '#app/exceptions/respond_error';
import * as AdminCacheService from '#services/admin_cache_service';
import { isCacheSection } from '#services/cache_keys';
import { cacheKeyListValidator, cacheKeyValidator } from '#validators/admin_validator';

/** Super-admin Cache console. Gated by [auth, superAdmin] on the route group. */
export default class AdminCacheController {
  /** GET /api/admin/cache — metrics + per-section breakdown. */
  async overview({ response }: HttpContext) {
    try {
      return response.ok(await AdminCacheService.overview());
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/admin/cache/keys?section=&search=&page=&perPage= — paginated key browser. */
  async keys({ request, response }: HttpContext) {
    try {
      const opts = await cacheKeyListValidator.validate(request.qs());
      return response.ok(await AdminCacheService.listKeys(opts));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** GET /api/admin/cache/entry?key= — a single key's metadata + value. */
  async entry({ request, response }: HttpContext) {
    try {
      const { key } = await cacheKeyValidator.validate(request.qs());
      return response.ok(await AdminCacheService.getEntry(key));
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/admin/cache/entry — delete one key (body: { key }). */
  async deleteEntry({ request, response }: HttpContext) {
    try {
      const { key } = await cacheKeyValidator.validate(request.body());
      await AdminCacheService.deleteKey(key);
      return response.ok({ message: 'Key deleted', key });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/admin/cache/section/:section — clear one section. */
  async deleteSection({ params, response }: HttpContext) {
    if (!isCacheSection(params.section)) {
      return response.badRequest({ message: 'Unknown cache section' });
    }
    try {
      const deleted = await AdminCacheService.deleteSection(params.section);
      return response.ok({ message: 'Section cleared', section: params.section, deleted });
    } catch (error) {
      return respondError(error, response);
    }
  }

  /** DELETE /api/admin/cache — flush the entire cache namespace. */
  async flush({ response }: HttpContext) {
    try {
      const deleted = await AdminCacheService.flushAll();
      return response.ok({ message: 'Cache flushed', deleted });
    } catch (error) {
      return respondError(error, response);
    }
  }
}
