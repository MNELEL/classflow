// ── Theme definitions for ClassFlow ──
// Each theme overrides CSS variables defined in index.css.
// Applied by adding the theme class to document.documentElement.

export const THEMES = [
  {
    id: 'modern',
    name: 'מודרני',
    description: 'טורקיז עמוק — ברירת מחדל',
    preview: ['#0d9488', '#f0fdfa', '#0f172a'],
  },
  {
    id: 'conservative',
    name: 'שמרני',
    description: 'כחול ימי מסורתי',
    preview: ['#1e3a5f', '#eff6ff', '#1e293b'],
  },
  {
    id: 'minimal',
    name: 'מינימליסטי',
    description: 'אפור נקי ומעודן',
    preview: ['#475569', '#f8fafc', '#1e293b'],
  },
  {
    id: 'retroDark',
    name: 'רטרו כהה',
    description: 'חום-כתום חמים בחושך',
    preview: ['#c2410c', '#1c1917', '#fef3c7'],
  },
  {
    id: 'scholastic',
    name: 'סכולסטי',
    description: 'ירוק יער אקדמי',
    preview: ['#15803d', '#f0fdf4', '#14532d'],
  },
  {
    id: 'sunset',
    name: 'שקיעה',
    description: 'כתום-ורוד חם ומרגיע',
    preview: ['#db2777', '#fdf2f8', '#831843'],
  },
  {
    id: 'ocean',
    name: 'אוקיינוס',
    description: 'כחול עמוק ים תיכוני',
    preview: ['#0369a1', '#f0f9ff', '#082f49'],
  },
];

export const DEFAULT_THEME = 'modern';

export const THEME_KEY = 'classflow_theme';

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(themeId) {
  try { localStorage.setItem(THEME_KEY, themeId); } catch {}
  applyThemeClass(themeId);
}

export function applyThemeClass(themeId) {
  const root = document.documentElement;
  // Remove all theme classes
  THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
  // Add the selected theme (default 'modern' is the base, no extra class needed)
  if (themeId && themeId !== 'modern') {
    root.classList.add(`theme-${themeId}`);
  }
}