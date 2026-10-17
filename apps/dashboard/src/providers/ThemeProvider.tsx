'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

// The stored preference, read through useSyncExternalStore. Storage can be
// unavailable (blocked, private mode): that just means the default theme.
const themeListeners = new Set<() => void>();
// Last choice made in this tab, used when storage can't be read.
let chosenTheme: Theme | null = null;

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && THEMES.includes(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return chosenTheme ?? 'light';
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  // Another tab changed the theme.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function subscribeSystem(listener: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

/**
 * Lightweight theme provider (no external dep). The initial class is set by a
 * blocking inline script in the root layout to avoid a flash; this provider
 * keeps React in sync and reacts to user, other-tab and system changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light until every screen is tokenized for dark mode; users can
  // still opt into dark/system via the toggle. Server render = the defaults.
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, (): Theme => 'light');
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  );
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Keep the <html> class in step (the DOM is the external system here).
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    chosenTheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts until reload */
    }
    themeListeners.forEach((listener) => listener());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
