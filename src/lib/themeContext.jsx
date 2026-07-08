import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { THEMES, DEFAULT_THEME, THEME_KEY, loadTheme, saveTheme, applyThemeClass } from '@/lib/themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme);
  const [syncing, setSyncing] = useState(false);

  // Apply theme class on mount
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Sync from DB on mount (if user is authenticated)
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
          // DB is source of truth if different
          if (dbTheme && dbTheme !== localTheme) {
            const dbUpdated = settings[0].updated_at ? new Date(settings[0].updated_at) : new Date(0);
            // Always prefer DB version
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme, themes: THEMES, syncing }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: DEFAULT_THEME, setTheme: () => {}, themes: THEMES, syncing: false };
  return ctx;
}