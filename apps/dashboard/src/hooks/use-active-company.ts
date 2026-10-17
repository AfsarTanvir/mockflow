'use client';

import { useSyncExternalStore } from 'react';
import { getActiveCompanyClient, subscribeActiveCompany } from '@/lib/active-company';

/**
 * The active company slug from the cookie. null on the server and during
 * hydration, then the cookie's value; re-renders when setActiveCompanyClient
 * writes a new one.
 */
export function useActiveCompanySlug(): string | null {
  return useSyncExternalStore(subscribeActiveCompany, getActiveCompanyClient, () => null);
}
