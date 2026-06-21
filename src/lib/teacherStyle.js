/**
 * Teacher Style Profile
 * Learns the teacher's style from library items and injects it into AI prompts.
 * Style is extracted from real uploaded content (transcripts, summaries, key points).
 */

import { base44 } from '@/api/base44Client';

const STYLE_KEY = 'teacher_style_profile';
const STYLE_VERSION_KEY = 'teacher_style_version';

export function loadStyleProfile() {
  try {
    return JSON.parse(localStorage.getItem(STYLE_KEY) || 'null');
  } catch { return null; }
}

export function saveStyleProfile(profile) {
  localStorage.setItem(STYLE_KEY, JSON.stringify(profile));
}

export function clearStyleProfile() {
  localStorage.removeItem(STYLE_KEY);
  localStorage.removeItem(STYLE_VERSION_KEY);
}

/**
 * Analyzes library items with real content and extracts teacher style fingerprint.
 * Returns the profile and saves it to localStorage.
 */
export async function extractStyleFromLibrary(libraryItems) {
  // Only use items that have real content (transcript or ai_summary)
  const richItems = libraryItems.filter(i =>
    !i.is_archived && (i.transcript || i.ai_summary) && i.ai_status === 'ready'
  );

  if (richItems.length === 0) return null;

  // Build a representative content sample (up to 8 items, 600 chars each)
  const samples = richItems.slice(0, 8).map(item => {
    const text = [item.transcript, item.ai_summary, ...(item.ai_key_points || [])]
      .filter(Boolean).join('\n').slice(0, 600);
    return `📚 "${item.title}" (${item.subject || item.category || ''}):\n${text}`;
  }).join('\n\n---\n\n');

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `אתה מנתח סגנון הוראה. קרא את הדוגמאות הבאות מחומרי לימוד שהמורה יצר/ה ונתח את הסגנון הייחודי שלו/ה.

חומרי המורה (${richItems.length} פריטים):
${samples}

נתח והחזר JSON עם הפרופיל הבא:
- language_style: תיאור הסגנון הלשוני (למשל: "שפה פשוטה וישירה", "שפה אקדמית עם מושגים מקצועיים", "סגנון סיפורי ומעניין")
- question_style: איך המורה שואל שאלות (למשל: "שאלות קצרות ועובדתיות", "שאלות חשיבה ביקורתית", "שאלות מבוססות מקרים")  
- structure_preference: העדפות מבניות (למשל: "רשימות ממוספרות", "כותרות ותת-כותרות", "פסקאות רצופות")
- tone: טון כללי (למשל: "חם ועידוד", "עסקי ומקצועי", "סקרני ואינטראקטיבי")
- key_vocabulary: רשימה של עד 10 מילות מפתח/ביטויים אופייניים שהמורה משתמש בהם
- topics_covered: הנושאים/מקצועות העיקריים
- pedagogical_approach: גישה פדגוגית (למשל: "למידה הדרגתית", "דוגמאות מהחיים", "חזרה ותרגול")
- sample_sentence_style: דוגמה לאופן ניסוח שהמורה משתמש בו (משפט לדוגמה)`,
    response_json_schema: {
      type: 'object',
      properties: {
        language_style: { type: 'string' },
        question_style: { type: 'string' },
        structure_preference: { type: 'string' },
        tone: { type: 'string' },
        key_vocabulary: { type: 'array', items: { type: 'string' } },
        topics_covered: { type: 'array', items: { type: 'string' } },
        pedagogical_approach: { type: 'string' },
        sample_sentence_style: { type: 'string' },
      }
    }
  });

  const profile = {
    ...result,
    items_count: richItems.length,
    generated_at: new Date().toISOString(),
  };

  saveStyleProfile(profile);
  localStorage.setItem(STYLE_VERSION_KEY, richItems.length.toString());
  return profile;
}

/**
 * Returns a style injection string to prepend to any AI generation prompt.
 * This ensures all generated content mirrors the teacher's actual style.
 */
export function buildStyleInstruction(profile) {
  if (!profile) return '';

  return `
⚠️ חשוב מאוד — סגנון המורה (חובה לאמץ):
המורה לימד/ה חומרים בסגנון ספציפי שעליך לשמר בכל מה שתיצור:
• סגנון שפה: ${profile.language_style}
• סגנון שאלות: ${profile.question_style}
• מבנה מועדף: ${profile.structure_preference}
• טון: ${profile.tone}
• גישה פדגוגית: ${profile.pedagogical_approach}
• אוצר מילים אופייני: ${(profile.key_vocabulary || []).join(', ')}
• דוגמה לניסוח: "${profile.sample_sentence_style}"

כל החומרים שתיצור חייבים להיות:
1. תואמים לסגנון ולטון שתואר לעיל
2. בנושאי המקצוע שבהם המורה מתמחה: ${(profile.topics_covered || []).join(', ')}
3. עקביים עם הגישה הפדגוגית של המורה
4. מבוססים אך ורק על תוכן שסופק — לא להמציא עובדות או נושאים שלא הופיעו בחומרים
`.trim();
}