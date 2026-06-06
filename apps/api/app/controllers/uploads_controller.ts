import type { HttpContext } from '@adonisjs/core/http';
import * as AvatarService from '#services/avatar_service';

export default class UploadsController {
  /** GET /uploads/avatars/:file — public, serves a stored avatar image. */
  async avatar({ params, response }: HttpContext) {
    const path = AvatarService.resolveServePath(params.file);
    if (!path) return response.badRequest({ message: 'Invalid file name' });
    response.header('Cache-Control', 'public, max-age=86400');
    return response.download(path);
  }
}
