import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── AI template analysis ────────────────────────────────────────────────────
// Given an uploaded image (a photo of an existing certificate or weekly
// bulletin), asks the model to describe both the visual layout AND the
// exact wording used, so we can regenerate new documents in the same style.
//
// All prompts enforce HEBREW-ONLY output — the system is Hebrew-native and
// analyses must never fall back to English.

const HEBREW_RULE = 'חובה מפורשת: כל התשובות בעברית בלבד. אל תכתוב שום מילה באנגלית — לא בכותרות, לא בתיאורים ולא בנוסח. החריגים היחידים הם קודי HEX ואימוג׳י/סמלים.';

// Structured design tokens extracted from the template image, shared by both
// the certificate and bulletin schemas. These let the generated documents
// replicate the original visual style (frame, colors, font, decorations),
// not just the text.
const DESIGN_FIELDS = {
  secondary_color: { type: 'string', description: 'צבע משני/רקע בהיר כקוד HEX (למשל #ede9fe). אם אין ברור, החזר את accent_color עם סיומת שקיפות 22' },
  background_color: { type: 'string', description: 'צבע הרקע של המסמך כקוד HEX (למשל #fffdf8 או #ffffff)' },
  frame_style: { type: 'string', enum: ['double', 'single', 'ornate', 'none'], description: 'סגנון המסגרת: double (מסגרת כפולה), single (קו אחד), ornate (מסגרת מקושטת עם עיטורי פינות), none (ללא מסגרת)' },
  frame_color: { type: 'string', description: 'צבע המסגרת כקוד HEX. אם לא זוהה בבירור, החזר את accent_color' },
  corner_decoration: { type: 'string', enum: ['none', 'floral', 'stars', 'geometric'], description: 'עיטור פינות: none (ללא), floral (פרחוני/חופשי), stars (כוכבים), geometric (צורות גיאומטריות)' },
  title_font: { type: 'string', enum: ['serif', 'sans', 'decorative'], description: 'סוג גופן הכותרת: serif (קלאסי מעוצב), sans (מודרני נקי), decorative (מעוצב בולט)' },
  title_align: { type: 'string', enum: ['center', 'right'], description: 'יישור הכותרת הראשית' },
  icon_symbol: { type: 'string', description: 'סמל/אימוג׳י שמופיע במסמך (למשל ★ 🎖 🏆 ✡️). אם אין, החזר ריק' },
  has_watermark: { type: 'boolean', description: 'האם יש סימן מים ברקע המסמך' },
  watermark_text: { type: 'string', description: 'טקסט סימן המים אם קיים, אחרת ריק' },
};

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
      description: 'תיאור מבנה התעודה בעברית: מיקום לוגו, כותרת, שם תלמיד, טקסט, חתימה ותאריך; האם יש מסגרת/עיטורים',
    },
    ...DESIGN_FIELDS,
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
      description: 'תיאור מבנה החוברת בעברית: סדר המדורים, מיקום לוגו/כותרת, האם יש עמודות, מסגרות או אייקונים',
    },
    ...DESIGN_FIELDS,
  },
  required: ['detected_title', 'accent_color', 'layout_description'],
};

function buildDesign(data) {
  return {
    accent_color: /^#[0-9a-fA-F]{6}$/.test(data.accent_color) ? data.accent_color : '#7c3aed',
    secondary_color: /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(data.secondary_color) ? data.secondary_color : '',
    background_color: /^#[0-9a-fA-F]{6}$/.test(data.background_color) ? data.background_color : '',
    frame_style: ['double', 'single', 'ornate', 'none'].includes(data.frame_style) ? data.frame_style : 'double',
    frame_color: /^#[0-9a-fA-F]{6}$/.test(data.frame_color) ? data.frame_color : '',
    corner_decoration: ['none', 'floral', 'stars', 'geometric'].includes(data.corner_decoration) ? data.corner_decoration : 'none',
    title_font: ['serif', 'sans', 'decorative'].includes(data.title_font) ? data.title_font : 'sans',
    title_align: ['center', 'right'].includes(data.title_align) ? data.title_align : 'center',
    icon_symbol: typeof data.icon_symbol === 'string' ? data.icon_symbol.slice(0, 8) : '',
    has_watermark: !!data.has_watermark,
    watermark_text: typeof data.watermark_text === 'string' ? data.watermark_text.slice(0, 60) : '',
    layout_density: ['airy', 'compact'].includes(data.layout_density) ? data.layout_density : 'airy',
  };
}

/**
 * Analyzes a template image (certificate or weekly bulletin) via AI and
 * stores the result on the matching CertificateTemplate record.
 */
export async function analyzeTemplate(templateId, kind, fileUrl) {
  await base44.entities.CertificateTemplate.update(templateId, { status: 'analyzing' });

  try {
    const schema = kind === 'weekly_bulletin' ? BULLETIN_SCHEMA : CERTIFICATE_SCHEMA;
    const prompt = kind === 'weekly_bulletin'
      ? `זו תמונה של חוברת קשר שבועית להורים ממוסד חינוכי חרדי/דתי. נתח את העיצוב והנוסח המדויק שלה כדי שנוכל להפיק חוברות חדשות באותו סגנון כל שבוע. חלץ גם את טוקני העיצוב (צבעים, מסגרת, גופן, עיטורים) כדי שנשחזר את המראה הוויזואלי. ${HEBREW_RULE}`
      : `זו תמונה של תעודת הוקרה/הצטיינות מוסדית. נתח את העיצוב והנוסח המדויק שלה (כולל המילים המדויקות של הברכה) כדי שנוכל להפיק תעודות חדשות באותו סגנון. חלץ גם את טוקני העיצוב (צבעים, מסגרת, גופן, עיטורים, סמל) כדי שנשחזר את המראה הוויזואלי ולא רק את הטקסט. ${HEBREW_RULE}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: schema,
    });

    // Some SDK/runtime versions wrap structured results in `.output`; support both.
    const data = result?.output || result || {};
    const accent = /^#[0-9a-fA-F]{6}$/.test(data.accent_color) ? data.accent_color : '#7c3aed';
    const design = buildDesign({ ...data, accent_color: accent });

    await base44.entities.CertificateTemplate.update(templateId, {
      status: 'ready',
      detected_title: data.detected_title || '',
      detected_body_text: data.detected_body_text || '',
      detected_subjects: data.detected_subjects || [],
      accent_color: accent,
      design,
      analyzed_layout: {
        layout_description: data.layout_description || '',
        design,
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