/**
 * Active-company cookie helpers.
 *
 * The cookie stores the user's currently selected company *slug* (more readable
 * than a UUID in dev tools). The API treats the cookie as a non-authoritative
 * hint — every endpoint re-validates membership server-side. So the cookie is
 * not HTTP-only (client switcher needs to write it) and not security-sensitive.
 */

const COOKIE_NAME = 'mockflow_active_company';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Cookie writes don't emit events, so writers notify subscribers themselves
// (see useActiveCompanySlug).
const listeners = new Set<() => void>();

export function subscribeActiveCompany(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Client-side: read the cookie. Returns slug or null. */
export function getActiveCompanyClient(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Client-side: set the cookie. Pass null to clear. */
export function setActiveCompanyClient(slug: string | null): void {
  if (typeof document === 'undefined') return;
  if (slug === null) {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(slug)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
  }
  listeners.forEach((listener) => listener());
}

/**
 * Server-side: read the cookie inside an RSC.
 * Returns null if not set or if running outside a server context.
 */
export async function getActiveCompanyServer(): Promise<string | null> {
  if (typeof window !== 'undefined') return null;
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
