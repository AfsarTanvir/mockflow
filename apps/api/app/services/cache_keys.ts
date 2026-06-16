/**
 * Cache key builders + the section registry.
 *
 * Keys here are LOGICAL (no root prefix). #services/cache_service prepends the
 * single `mockflow:cache:` root prefix when talking to Redis. A "section" is the
 * stable prefix before the entity id (`mock:blueprint`, `entity:company`, …) —
 * the admin Cache console groups and clears by these.
 *
 * Note: `stats:*` keys (hit/miss counters) live under the same root prefix but
 * are intentionally NOT a browsable section — they back the metrics row only.
 */

export const CACHE_SECTIONS = [
  'mock:slug',
  'mock:blueprint',
  'entity:company',
  'entity:project',
  'entity:team',
  'entity:profile',
] as const;

export type CacheSection = (typeof CACHE_SECTIONS)[number];

export const cacheKeys = {
  /** slug → { projectId, isPublic, ownerId, teamId } (mock entry resolution). */
  mockSlug: (slug: string) => `mock:slug:${slug}`,
  /** Full per-project mock resolution data (settings + endpoints + scenarios + rules). */
  mockBlueprint: (projectId: string) => `mock:blueprint:${projectId}`,
  company: (slug: string) => `entity:company:${slug}`,
  project: (id: string) => `entity:project:${id}`,
  team: (id: string) => `entity:team:${id}`,
  profile: (id: string) => `entity:profile:${id}`,
};

/** The section a logical key belongs to (everything before the final `:id`). */
export function sectionOf(key: string): string {
  const i = key.lastIndexOf(':');
  return i === -1 ? key : key.slice(0, i);
}

/** Whether a string is one of the registered, admin-browsable sections. */
export function isCacheSection(value: string): value is CacheSection {
  return (CACHE_SECTIONS as readonly string[]).includes(value);
}
