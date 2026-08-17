import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── AI template analysis ────────────────────────────────────────────────────
// Given an uploaded image (a photo of an existing certificate or weekly
// bulletin), asks the model to describe both the visual layout AND the
// exact wording used, so we can regenerate new documents in the same style.

const CERTIFICATE_SCHEMA = {
  type: 'object',
  properties: {
    detected_title: {
      type: 'string',
      description: 'הכותרת הראשית של התעודה, בדיוק כפי שכתובה בתמונה (למשל "תעודת הצטיינות")',
    },
    detected_body_text: {
      type: 'string',
      description: 'נוסח הברכה/הטקסט המרכזי בתעודה, בדיוק כפי שכתוב בתמונה, כולל כל המילים',
    },
    detected_subjects: {
      type: 'array',
      items: { type: 'string' },
      description: 'רשימת מקצועות/תחומי לימוד המוזכרים בתעודה (למשל גמרא, משנה, הלכה) — ריק אם אין',
    },
    accent_color: {
      type: 'string',
      description: 'הצבע הדומיננטי/המסגרת בתעודה כקוד HEX (למשל #7c3aed). נחש בצורה סבירה מהתמונה',
    },
    layout_description: {
      type: 'string',
      description: 'תיאור מבנה התעודה: מיקום לוגו, כותרת, שם תלמיד, טקסט, חתימה ותאריך; האם יש מסגרת/עיטורים',
    },
  },
  required: ['detected_title', 'detected_body_text', 'accent_color', 'layout_description'],
};

const BULLETIN_SCHEMA = {
  type: 'object',
  properties: {
    detected_title: {
      type: 'string',
      description: 'הכותרת הראשית של חוברת הקשר, בדיוק כפי שכתובה בתמונה',
    },
    detected_body_text: {
      type: 'string',
      description: 'משפט פתיחה/נוסח קבוע שחוזר על עצמו בחוברת, אם יש',
    },
    detected_subjects: {
      type: 'array',
      items: { type: 'string' },
      description: 'כותרות המדורים הקבועים בחוברת (למשל "מה למדנו השבוע", "חידת השבוע", "מסרים מההורים")',
    },
    accent_color: {
      type: 'string',
      description: 'הצבע הדומיננטי בעיצוב החוברת כקוד HEX',
    },
    layout_description: {
      type: 'string',
      description: 'תיאור מבנה החוברת: סדר המדורים, מיקום לוגו/כותרת, האם יש עמודות, מסגרות או אייקונים',
    },
  },
  required: ['detected_title', 'accent_color', 'layout_description'],
};

/**
 * Analyzes a template image (certificate or weekly bulletin) via AI and
 * stores the result on the matching CertificateTemplate record.
 */
export async function analyzeTemplate(templateId, kind, fileUrl) {
  await base44.entities.CertificateTemplate.update(templateId, { status: 'analyzing' });

  try {
    const schema = kind === 'weekly_bulletin' ? BULLETIN_SCHEMA : CERTIFICATE_SCHEMA;
    const prompt = kind === 'weekly_bulletin'
      ? 'זו תמונה של חוברת קשר שבועית להורים ממוסד חינוכי חרדי/דתי. נתח את העיצוב והנוסח המדויק שלה כדי שנוכל להפיק חוברות חדשות באותו סגנון כל שבוע.'
      : 'זו תמונה של תעודת הוקרה/הצטיינות מוסדית. נתח את העיצוב והנוסח המדויק שלה (כולל המילים המדויקות של הברכה) כדי שנוכל להפיק תעודות חדשות באותו סגנון.';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: schema,
    });

    // Some SDK/runtime versions wrap structured results in `.output`; support both.
    const data = result?.output || result || {};

    await base44.entities.CertificateTemplate.update(templateId, {
      status: 'ready',
      detected_title: data.detected_title || '',
      detected_body_text: data.detected_body_text || '',
      detected_subjects: data.detected_subjects || [],
      accent_color: /^#[0-9a-fA-F]{6}$/.test(data.accent_color) ? data.accent_color : '#7c3aed',
      analyzed_layout: {
        layout_description: data.layout_description || '',
        analyzed_at: new Date().toISOString(),
      },
    });

    toast.success('התבנית נותחה בהצלחה');
    return true;
  } catch (e) {
    await base44.entities.CertificateTemplate.update(templateId, { status: 'error' });
    toast.error('שגיאה בניתוח התבנית: ' + (e?.message || ''));
    return false;
  }
}

/**
 * Creates (or reuses) a CertificateTemplate row for a LibraryItem tagged
 * as a template, and kicks off analysis.
 */
export async function ensureTemplateAndAnalyze(libraryItem, kind) {
  const existing = await base44.entities.CertificateTemplate.filter({ library_item_id: libraryItem.id });
  let template = existing?.[0];

  if (!template) {
    template = await base44.entities.CertificateTemplate.create({
      library_item_id: libraryItem.id,
      kind,
      name: libraryItem.title || (kind === 'weekly_bulletin' ? 'חוברת קשר' : 'תעודה'),
      status: 'pending',
    });
  }

  if (!libraryItem.file_url) {
    toast.error('לתבנית זו אין קובץ תמונה מקורי');
    return null;
  }

  await analyzeTemplate(template.id, kind, libraryItem.file_url);
  return template.id;
}
