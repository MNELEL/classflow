import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { THEMES, DEFAULT_THEME, THEME_KEY, loadTheme, saveTheme, applyThemeClass } from '@/lib/themes';

const ThemeContext = createContext(null);

const SETTINGS_KEY = 'classmanager_settings';

/** Read light/dark/system preference from classmanager_settings localStorage */
function loadDarkMode() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return settings.theme || 'system';
  } catch {
    return 'system';
  }
}

/** Persist light/dark/system preference back to classmanager_settings */
function saveDarkMode(mode) {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    settings.theme = mode;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

/** Synchronously toggle the 'dark' class on <html> based on the mode */
function applyDarkClass(mode) {
  const root = document.documentElement;
  let shouldDark = mode === 'dark';
  if (mode === 'system') {
    shouldDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  root.classList.toggle('dark', shouldDark);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme);       // CSS-variable theme (modern, ocean, …)
  const [darkMode, setDarkModeState] = useState(loadDarkMode); // light / dark / system
  const [syncing, setSyncing] = useState(false);

  // Apply CSS-variable theme class on mount and whenever it changes
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Apply dark/light class synchronously on mount and whenever darkMode changes
  useEffect(() => {
    applyDarkClass(darkMode);
  }, [darkMode]);

  // When darkMode is 'system', register an active listener to
  // prefers-color-scheme so the .dark class updates in real-time.
  // Only active in system mode — explicit light/dark are static.
  useEffect(() => {
    if (darkMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    // Apply immediately for the current system state
    applyDarkClass('system');
    const handler = () => applyDarkClass('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [darkMode]);

  // Sync CSS-variable theme from DB on mount (if user is authenticated)
  useEffect(() => {
    let cancelled = false;
    async function syncFromDB() {
      try {
        const authed = await base44.auth.isAuthenticated();
        if (!authed) return;
        const settings = await base44.entities.TeacherSettings.list('-updated_date', 1);
        if (cancelled) return;
        if (settings?.length > 0) {
          const dbTheme = settings[0].theme;
          const localTheme = loadTheme();
          if (dbTheme && dbTheme !== localTheme) {
            setTheme(dbTheme);
            saveTheme(dbTheme);
          }
        }
      } catch {
        // Not authenticated or no settings yet — silent
      }
    }
    syncFromDB();
    return () => { cancelled = true; };
  }, []);

  const changeTheme = useCallback(async (newTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    // Sync to DB
    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) return;
      setSyncing(true);
      const existing = await base44.entities.TeacherSettings.list('-updated_date', 1);
      if (existing?.length > 0) {
        await base44.entities.TeacherSettings.update(existing[0].id, {
          theme: newTheme,
          updated_at: new Date().toISOString(),
        });
      } else {
        const user = await base44.auth.me();
        await base44.entities.TeacherSettings.create({
          uid: user.id,
          theme: newTheme,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Silent — localStorage is the fallback
    }
    setSyncing(false);
  }, []);

  const changeDarkMode = useCallback((mode) => {
    setDarkModeState(mode);
    saveDarkMode(mode);
    applyDarkClass(mode); // apply synchronously for immediate visual feedback
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: changeTheme, themes: THEMES, syncing, darkMode, setDarkMode: changeDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: DEFAULT_THEME, setTheme: () => {}, themes: THEMES, syncing: false, darkMode: 'system', setDarkMode: () => {} };
  return ctx;
}