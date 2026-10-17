/**
 * A project's base path is a literal prefix in front of every endpoint path:
 * with basePath "/v1", endpoint "/users" answers at /mock/<slug>/v1/users.
 * One definition shared by the mock matcher, the exporters and project saves.
 */

/** Allowed characters: a literal URL path (no ":param" or "*" — it's a prefix, not a pattern). */
export const BASE_PATH_RE = /^\/[A-Za-z0-9._~\-/]*$/;

/** Canonical form: '' for the root, otherwise "/a/b" (leading slash, no trailing slash). */
export function normalizeBasePath(basePath: string | null | undefined): string {
  const trimmed = (basePath ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** What to store in projects.base_path ('/' for the root). */
export function storedBasePath(basePath: string | null | undefined): string {
  return normalizeBasePath(basePath) || '/';
}

/**
 * The request path relative to the base path, or null when the request is
 * outside it. Case-insensitive, like endpoint matching (path-to-regexp default).
 */
export function stripBasePath(path: string, basePath: string | null | undefined): string | null {
  const base = normalizeBasePath(basePath);
  if (!base) return path;
  const lowerPath = path.toLowerCase();
  const lowerBase = base.toLowerCase();
  if (lowerPath === lowerBase) return '/';
  if (lowerPath.startsWith(`${lowerBase}/`)) return path.slice(base.length);
  return null;
}
