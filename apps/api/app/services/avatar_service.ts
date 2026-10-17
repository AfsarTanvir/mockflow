import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Exception } from '@adonisjs/core/exceptions';
import app from '@adonisjs/core/services/app';
import type { MultipartFile } from '@adonisjs/core/bodyparser';

/**
 * Shared avatar storage.
 *
 * Uploaded images live on local disk under `<app>/uploads/avatars/` and are
 * served back publicly via `GET /uploads/avatars/:file` (see uploads_controller).
 * Stored avatar values are always ABSOLUTE URLs so the frontend can render them
 * directly. The `baseUrl` is derived from the upload request (so the served URL
 * always points at the same API origin the browser reached), not an env var.
 */

export const AVATAR_EXTNAMES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
export const AVATAR_MAX_SIZE = '2mb';

const AVATAR_SUBDIR = 'uploads/avatars';
const SERVE_PATH = '/uploads/avatars';

/**
 * `apps/api`, also when running the production build: there the app root is
 * `apps/api/build`, which `npm run build` wipes, so uploads must not live in it
 * (and avatars saved by the dev server would 404).
 */
function projectRoot(): string {
  const root = fileURLToPath(app.appRoot);
  return basename(root.replace(/\/+$/, '')) === 'build' ? dirname(root) : root;
}

function avatarsDir(...segments: string[]): string {
  return join(projectRoot(), AVATAR_SUBDIR, ...segments);
}

/**
 * Validate (done at the controller via request.file constraints) and persist an
 * uploaded avatar, returning its absolute public URL built from `baseUrl`
 * (e.g. `http://localhost:3333`).
 */
export async function storeUpload(file: MultipartFile, baseUrl: string): Promise<string> {
  if (!file.isValid) {
    throw new Exception(file.errors[0]?.message ?? 'Invalid image file', {
      status: 422,
      code: 'E_INVALID_FILE',
    });
  }

  const name = `${randomUUID()}.${file.extname}`;
  await mkdir(avatarsDir(), { recursive: true });
  await file.move(avatarsDir(), { name, overwrite: true });

  return `${baseUrl.replace(/\/+$/, '')}${SERVE_PATH}/${name}`;
}

/**
 * If `url` points at one of our locally-stored avatars, delete the file
 * (best-effort — used to clean up the previous avatar when it's replaced).
 */
export async function deleteIfLocal(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const match = url.match(/\/uploads\/avatars\/([A-Za-z0-9._-]+)$/);
  if (!match) return;
  try {
    await unlink(avatarsDir(match[1]));
  } catch {
    /* already gone — ignore */
  }
}

/**
 * Resolve a requested filename to an on-disk path for serving, rejecting any
 * path-traversal attempt. Returns null if the name is unsafe.
 */
export function resolveServePath(filename: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) return null;
  return avatarsDir(filename);
}
