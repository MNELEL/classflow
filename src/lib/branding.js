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