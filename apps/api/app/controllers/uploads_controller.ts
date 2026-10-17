import { access } from 'node:fs/promises';
import type { HttpContext } from '@adonisjs/core/http';
import * as AvatarService from '#services/avatar_service';

export default class UploadsController {
  /** GET /uploads/avatars/:file — public, serves a stored avatar image. */
  async avatar({ params, response }: HttpContext) {
    const path = AvatarService.resolveServePath(params.file);
    if (!path) return response.badRequest({ message: 'Invalid file name' });
    // Check first: the day-long cache header must not go out on a 404, or the
    // browser keeps showing a broken avatar after the file appears.
    const exists = await access(path).then(
      () => true,
      () => false
    );
    if (!exists) return response.notFound({ message: 'Avatar not found' });
    response.header('Cache-Control', 'public, max-age=86400');
    return response.download(path);
  }
}
