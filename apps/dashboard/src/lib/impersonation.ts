/**
 * Client-side impersonation session helpers. The auth token lives in a
 * JS-readable `token` cookie (see http-client). To impersonate we stash the
 * admin's token under `admin_token`, swap in the impersonation token, and record
 * the target's name in `impersonating`. Exiting restores the admin token.
 */

const TOKEN = 'token';
const BACKUP = 'admin_token';
const NAME = 'impersonating';

const HOUR = 60 * 60;
const MONTH = 60 * 60 * 24 * 30;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function setCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSec}; samesite=lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Begin impersonating: back up the admin token, swap in the new one. */
export function startImpersonation(name: string, token: string) {
  const current = readCookie(TOKEN);
  if (current) setCookie(BACKUP, current, MONTH);
  setCookie(TOKEN, token, HOUR);
  setCookie(NAME, encodeURIComponent(name), HOUR);
}

/** Name of the user currently being impersonated, or null. */
export function getImpersonatedName(): string | null {
  const value = readCookie(NAME);
  return value ? decodeURIComponent(value) : null;
}

/** Restore the admin token and clear impersonation state. */
export function stopImpersonation() {
  const backup = readCookie(BACKUP);
  if (backup) setCookie(TOKEN, backup, MONTH);
  deleteCookie(BACKUP);
  deleteCookie(NAME);
}
