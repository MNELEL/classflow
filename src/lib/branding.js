const BRANDING_KEY = 'classmanager_branding';

export const DEFAULT_BRANDING = {
  school_name: 'ClassManager Pro',
  teacher_name: '',
  class_name: '',
  logo_url: '',
  primary_color: '',
  nav_labels: {
    '/': 'דשבורד',
    '/seating': 'ישיבה',
    '/students': 'תלמידים',
    '/attendance': 'נוכחות',
    '/grades': 'ציונים',
    '/library': 'ספרייה',
    '/gamification': 'נקודות',
    '/toolkit': 'כלים',
    '/parents': 'הורים',
    '/worksheets': 'דפ"ע',
    '/question-bank': 'עזרים',
    '/lesson-analyzer': 'הקלטות',
    '/curriculum': 'הספקים',
    '/homework': 'מטלות',
  },
  page_titles: {
    '/': 'ClassManager Pro',
    '/seating': 'מפת ישיבה',
    '/students': 'תלמידים',
    '/attendance': 'נוכחות',
    '/grades': 'ציונים',
    '/library': 'ספרייה',
    '/gamification': 'נקודות',
    '/toolkit': 'כלים',
    '/parents': 'הורים',
    '/worksheets': 'דפי עבודה',
    '/question-bank': 'עזרים',
    '/lesson-analyzer': 'ניתוח שיעורים',
    '/curriculum': 'עוזר ההספקים',
    '/homework': 'מטלות ולוח שנה',
    '/history': 'היסטוריה',
    '/reports': 'דוחות',
    '/settings': 'הגדרות',
  },
};

export function loadBranding() {
  try {
    const saved = JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}');
    return {
      ...DEFAULT_BRANDING,
      ...saved,
      nav_labels: { ...DEFAULT_BRANDING.nav_labels, ...(saved.nav_labels || {}) },
      page_titles: { ...DEFAULT_BRANDING.page_titles, ...(saved.page_titles || {}) },
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(branding) {
  localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('branding-updated', { detail: branding }));
}

// ── DB sync (TeacherSettings entity) ──
// Saves branding to the user's TeacherSettings record for cross-device sync.
import { base44 } from '@/api/base44Client';

export async function syncBrandingToDB(branding) {
  try {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return;
    const existing = await base44.entities.TeacherSettings.list('-updated_date', 1);
    const payload = { branding, updated_at: new Date().toISOString() };
    if (existing?.length > 0) {
      await base44.entities.TeacherSettings.update(existing[0].id, payload);
    } else {
      const user = await base44.auth.me();
      await base44.entities.TeacherSettings.create({ uid: user.id, ...payload });
    }
  } catch {
    // Silent — localStorage is the fallback
  }
}

export async function loadBrandingFromDB() {
  try {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return null;
    const existing = await base44.entities.TeacherSettings.list('-updated_date', 1);
    if (existing?.length > 0 && existing[0].branding) {
      return existing[0].branding;
    }
  } catch {
    // Silent
  }
  return null;
}

// Save to both localStorage and DB
export async function saveBrandingSync(branding) {
  saveBranding(branding);
  await syncBrandingToDB(branding);
}