/**
 * אימות ותיקוף טקסט שחולץ (OCR / תמלול) לפני ניתוח AI ויצירת חומרים.
 * מטרה: למנוע יצירת שאלות/סיכומים מתוך טקסט רועש או חסר, ולסנן תשובות שאינן נתמכות במקור.
 */
import { base44 } from '@/api/base44Client';

const HEBREW_LETTERS_RE = /[א-ת]/g;
const REPLACEMENT_CHAR = '\uFFFD';
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/**
 * ניקוי והערכת איכות הטקסט שחולץ.
 * @returns {{ isValid, qualityScore, issues, cleanedText }}
 */
export function validateExtractedText(text, ocrConfidence) {
  const issues = [];

  if (!text || !text.trim()) {
    return { isValid: false, qualityScore: 0, issues: ['טקסט ריק — לא ניתן לנתח'], cleanedText: '' };
  }

  // ניקוי תווי רעש ותיקון רווחים
  const cleaned = text
    .replace(new RegExp(REPLACEMENT_CHAR, 'g'), '')
    .replace(CONTROL_CHARS_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const len = cleaned.length;

  // 1) אורך מינימלי
  if (len < 80) {
    issues.push(`טקסט קצר מדי (${len} תווים) — ייתכן שהחילוץ לא הצליח`);
  }

  // 2) יחס אותיות עבריות (מצביע על טקסט אמיתי מול רעש)
  const letters = cleaned.match(HEBREW_LETTERS_RE) || [];
  const hebrewRatio = len ? letters.length / len : 0;
  if (len > 200 && hebrewRatio < 0.08) {
    issues.push('יחס אותיות עבריות נמוך — ייתכן טקסט חיצוני או רועש חילוץ');
  }

  // 3) תווי רעש גבוהים (סימנים לא קריאים)
  const symbolNoise = (text.match(/[\uFFFD\u00A0•●▪◆□○]/g) || []).length;
  const noiseRatio = text.length ? symbolNoise / text.length : 0;
  if (noiseRatio > 0.05) {
    issues.push('יחס תווי רעש גבוה — ייתכן שה-OCR הכניס סימנים מזיקים');
  }

  // 4) חזרתיות חשודה (אותה מילה חוזרת פעמים רבות = כשל חילוץ)
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 20) {
    const freq = new Map();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const maxRepeat = Math.max(...freq.values());
    if (maxRepeat / words.length > 0.4) {
      issues.push('חזרתיות חשודה של מילים — ייתכן כשל חילוץ');
    }
  }

  // 5) ביטחון OCR נמוך
  if (ocrConfidence != null && !Number.isNaN(ocrConfidence) && ocrConfidence < 0.6) {
    issues.push(`ביטחון OCR נמוך (${Math.round(ocrConfidence * 100)}%)`);
  }

  // ציון איכות 0–1
  let score = 0;
  score += Math.min(len / 1500, 1) * 0.4;            // אורך עד 1500 תווים
  score += Math.min(hebrewRatio / 0.25, 1) * 0.4;    // יחס עברית
  score -= noiseRatio * 2;                            // עונש על רעש
  score -= issues.length * 0.12;                     // עונש על בעיות
  score = Math.max(0, Math.min(1, score));

  const isValid = len >= 80 && (hebrewRatio >= 0.06 || len <= 200) && issues.filter(i => i.includes('קצר מדי') || i.includes('רעש') || i.includes('חזרתיות')).length === 0;

  return { isValid, qualityScore: score, issues, cleanedText: cleaned };
}

/**
 * בונה הערת איכות להכללה בפרומפט — מזהירה את ה-AI מפני קטעים לא קריאים.
 */
export function buildQualityNote(validation) {
  if (!validation || validation.issues.length === 0) return '';
  return `הערת איכות חילוץ: ייתכנו קטעים לא קריאים/רועשים בטקסט. הסתמך אך ורק על הקטעים הקריאים וברורי המשמעות, והתעלם מקטעים חסרי משמעות. בעיות שזוהו: ${validation.issues.join('; ')}.`;
}

/**
 * אימות הישענות (grounding): בודק שהשאלות/תשובות שנוצרו אכן נתמכות בטקסט המקור.
 * מחזיר דוח עם מספר הפריטים הלא-נתמכים והאינדקסים שלהם.
 */
export async function verifyArtifactGrounding({ sourceText, structuredData }) {
  if (!sourceText || !structuredData) return null;
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה בודק אמינות קפדני. בדוק שכל שאלה/תשובה/טענה בחומר שנוצר נתמכת ישירות בטקסט המקור המצורף בלבד. אסור להמציא מידע שאינו בטקסט. לכל פריט שאינו נתמך — ציין את האינדקס שלו. החזר אך ורק אובייקט JSON תקין.

טקסט מקור:
"""
${sourceText.slice(0, 6000)}
"""

חומר שנוצר (JSON):
${JSON.stringify(structuredData).slice(0, 4000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          supported_count: { type: 'number' },
          unsupported_count: { type: 'number' },
          unsupported_indices: { type: 'array', items: { type: 'number' } },
          unsupported_reasons: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
        required: ['supported_count', 'unsupported_count'],
      },
    });
    return res;
  } catch {
    return null;
  }
}

/**
 * מסנן פריטים לא-נתמכים מתוך structuredData של ארטיפקט מסוג שאלות/חידון.
 * @returns { structuredData, removedCount }
 */
export function filterUnsupported(structuredData, verification) {
  if (!structuredData || !verification || !Array.isArray(verification.unsupported_indices) || verification.unsupported_indices.length === 0) {
    return { structuredData, removedCount: 0 };
  }
  const bad = new Set(verification.unsupported_indices);
  const arr = structuredData.questions || structuredData.cards || structuredData.activities || structuredData.items || [];
  if (!Array.isArray(arr)) return { structuredData, removedCount: 0 };
  const filtered = arr.filter((_, i) => !bad.has(i));
  const removedCount = arr.length - filtered.length;
  const key = structuredData.questions ? 'questions' : structuredData.cards ? 'cards' : structuredData.activities ? 'activities' : structuredData.items ? 'items' : null;
  if (!key) return { structuredData, removedCount };
  return { structuredData: { ...structuredData, [key]: filtered }, removedCount };
}