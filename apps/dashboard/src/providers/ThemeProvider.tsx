'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { DEFAULT_THEME as DEFAULT, THEME_STORAGE_KEY } from '@/lib/theme';

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
const DEFAULT_THEME: Theme = DEFAULT;

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== 'system') return theme;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Sets the <html> class. `animate` fades colours for a moment (a user or OS
 * switch), but never on first load, where the inline script already set it.
 */
function applyTheme(resolved: ResolvedTheme, animate: boolean): void {
  const root = document.documentElement;
  if (root.classList.contains('dark') === (resolved === 'dark')) return;
  if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
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
  return chosenTheme ?? DEFAULT_THEME;
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
  // The server can't know the stored choice or the OS appearance, so it renders
  // the defaults; the inline script has already set the right class.
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => DEFAULT_THEME);
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  );
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Keep the <html> class in step (the DOM is the external system here). It
  // reads the live values rather than resolvedTheme: on the hydration render
  // that still holds the server defaults and would undo the inline script.
  const mounted = useRef(false);
  useEffect(() => {
    applyTheme(resolve(readStoredTheme()), mounted.current);
    mounted.current = true;
  }, [theme, systemDark]);

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
