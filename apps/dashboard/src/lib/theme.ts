/**
 * Theme constants shared by the server layout (its inline no-flash script) and the
 * client ThemeProvider. Must stay a plain module: a value imported from a
 * 'use client' file is only a client reference on the server, not the value.
 */
export const THEME_STORAGE_KEY = 'mockflow-theme';

/** Like macOS "Auto": follow the OS appearance until the user picks a theme. */
export const DEFAULT_THEME = 'system';
