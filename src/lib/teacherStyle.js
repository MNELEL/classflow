/**
 * Teacher Style Engine
 * Deep-analyzes uploaded works, exams and lessons to fingerprint
 * the teacher's unique writing & pedagogical style, then injects
 * that fingerprint into every AI generation call.
 */

import { base44 } from '@/api/base44Client';

// ─── Persistence (RLS-protected backend entity, not localStorage) ─────────────
// Style profiles contain sensitive pedagogical data and are stored server-side
// in the TeacherStyleProfile entity, scoped to the authenticated user via RLS.
let _cache = null;

export async function loadStyleProfile() {
  if (_cache) return _cache;
  try {
    const records = await base44.entities.TeacherStyleProfile.list();
    if (records && records.length > 0) {
      _cache = JSON.parse(records[0].profile || 'null');
      return _cache;
    }
  } catch { /* not authenticated or no profile yet */ }
  return null;
}

export async function saveStyleProfile(profile) {
  _cache = profile;
  const json = JSON.stringify(profile);
  const records = await base44.entities.TeacherStyleProfile.list();
  if (records && records.length > 0) {
    await base44.entities.TeacherStyleProfile.update(records[0].id, { profile: json });
  } else {
    await base44.entities.TeacherStyleProfile.create({ profile: json });
  }
}

export async function clearStyleProfile() {
  _cache = null;
  const records = await base44.entities.TeacherStyleProfile.list();
  if (records && records.length > 0) {
    await base44.entities.TeacherStyleProfile.delete(records[0].id);
  }
}

// ─── Source classification ─────────────────────────────────────────────────
const EXAM_TYPES = ['exam', 'quiz', 'worksheet', 'word_doc', 'pdf', 'presentation'];

function classifyItem(item) {
  if (EXAM_TYPES.includes(item.source_type)) return 'exam_or_worksheet';
  if (item.source_type === 'audio_recording' || item.source_type === 'audio_file') return 'spoken_lesson';
  if (item.source_type === 'text_note') return 'written_note';
  return 'other';
}

function getItemContent(item) {
  return [
    item.transcript,
    item.ai_summary,
    ...(item.ai_key_points || []),
    item.description,
  ].filter(Boolean).join('\n').trim();
}

// ─── Core extraction ──────────────────────────────────────────────────────────
/**
 * Deep-analysis of all rich library items.
 * Single LLM call with a comprehensive schema — produces a full style fingerprint.
 * Includes validation + fallback so the profile is never empty.
 */
export async function extractStyleFromLibrary(libraryItems, onProgress) {
  const richItems = libraryItems.filter(i =>
    !i.is_archived && getItemContent(i).length > 80
  );

  if (richItems.length === 0) return null;

  onProgress?.('מארגן חומרים...', 5);

  // ── Step 1: collect samples per type ──────────────────────────────────────
  const exams   = richItems.filter(i => classifyItem(i) === 'exam_or_worksheet');
  const spoken  = richItems.filter(i => classifyItem(i) === 'spoken_lesson');
  const notes   = richItems.filter(i => classifyItem(i) === 'written_note');
  const other   = richItems.filter(i => classifyItem(i) === 'other');

  const pickBest = (arr, n, charsEach = 700) =>
    arr.slice(0, n).map(i => {
      const content = getItemContent(i).slice(0, charsEach);
      const type = classifyItem(i);
      return `【${type === 'exam_or_worksheet' ? 'מבחן/דף עבודה' : type === 'spoken_lesson' ? 'שיעור מוקלט' : type === 'written_note' ? 'הערה כתובה' : 'חומר נוסף'}】 "${i.title}" (${i.subject || i.category || ''})\n${content}`;
    }).join('\n\n---\n\n');

  const examSamples   = pickBest(exams,  4, 1200);
  const spokenSamples = pickBest(spoken, 3, 900);
  const notesSamples  = pickBest(notes,  2, 800);
  const otherSamples  = pickBest(other,  2, 600);

  const allSamples = [examSamples, spokenSamples, notesSamples, otherSamples]
    .filter(Boolean).join('\n\n═══\n\n');

  // Keep short titles for debugging
  const sampleTitles = richItems.slice(0, 10).map(i => i.title);

  onProgress?.('מנתח סגנון הוראה...', 25);

  // ── Step 2: Single comprehensive LLM call ────────────────────────────────
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `אתה מומחה בכיר לניתוח סגנון הוראה וכתיבה פדגוגית. לפניך חומרים שיצר מורה — מבחנים, דפי עבודה, שיעורים מוקלטים, הערות כתובות.

חומרי המורה לניתוח:
${allSamples}

עליך לנתח לעומק את הסגנון הייחודי של המורה. הנחיות חיוניות:
1. עבור כל שדה טקסט — כתוב לפחות 2-3 משפטים מפורטים. אסור להחזיר ערך ריק או null.
2. עבור שדות מערך — החזר לפחות 3-5 פריטים. אסור להחזיר מערך ריק.
3. הסתמך אך ורק על החומרים שלפניך. צטט ביטויים אמיתיים שמופיעים בחומר.
4. התייחס לשפה, למבנה, לטון, לאוצר המילים, לדפוסי השאלות, לגישה הפדגוגית, ולמוטיבציה.
5. שדה sample_sentences — כתוב 3 משפטים שמדמים בדיוק את סגנון הכתיבה של המורה (לא ציטוטים, אלא חיקוי סגנון).
6. כל התשובות בעברית.

החזר אובייקט JSON מלא ומפורט:`,
    response_json_schema: {
      type: 'object',
      properties: {
        language_style:         { type: 'string', description: 'תיאור מפורט (2-3 משפטים) של סגנון השפה, רמת השפה, מאפיינים לשוניים' },
        sentence_patterns:      { type: 'string', description: 'דפוסי משפטים אופייניים — אורך, מורכבות, מבנה' },
        question_style:         { type: 'string', description: 'איך המורה מנסח/ת שאלות — סגנון, רמת חשיבה, סוגי שאלות' },
        question_openings:      { type: 'array', items: { type: 'string' }, description: '5-8 פתיחות שאלות אופייניות שמופיעות אצל המורה' },
        explanation_style:      { type: 'string', description: 'איך המורה מסביר/ה מושגים — דוגמאות, אנלוגיות, צעדים' },
        structure_preference:   { type: 'string', description: 'העדפות מבניות בבניית מבחנים וחומרים' },
        tone:                   { type: 'string', description: 'טון כללי — רשמי/חם/מעודד/קפדן וכו' },
        formatting_habits:      { type: 'string', description: 'הרגלי עיצוב ופורמט — כותרות, מספור, חלוקה' },
        key_vocabulary:         { type: 'array', items: { type: 'string' }, description: '8-15 מילות מפתח וביטויים אופייניים שחוזרים אצל המורה' },
        recurring_phrases:      { type: 'array', items: { type: 'string' }, description: '4-8 ביטויים חוזרים ייחודיים של המורה' },
        sample_sentences:       { type: 'array', items: { type: 'string' }, description: '3 משפטים שמדמים בדיוק את סגנון הכתיבה של המורה' },
        pedagogical_approach:   { type: 'string', description: 'תיאור מפורט של הגישה הפדגוגית הכוללת' },
        teaching_methods:       { type: 'array', items: { type: 'string' }, description: '4-8 שיטות הוראה מועדפות' },
        difficulty_calibration: { type: 'string', description: 'רמת קושי אופיינית ושכבת גיל משוערת' },
        topics_covered:         { type: 'array', items: { type: 'string' }, description: '5-10 נושאי הוראה מרכזיים' },
        emphasis_patterns:      { type: 'string', description: 'מה המורה מדגיש/ה שוב ושבחומריו' },
        assessment_style:       { type: 'string', description: 'אופי המבחנים ודפי העבודה — מה נבדק ואיך' },
        learning_progression:   { type: 'string', description: 'כיצד בנויה הדרגתיות הלמידה בחומרים' },
        motivational_elements:  { type: 'string', description: 'אלמנטים מעודדים ומניעים בחומרים' },
      },
      required: ['language_style', 'question_style', 'pedagogical_approach', 'tone', 'difficulty_calibration']
    },
    model: 'claude_sonnet_4_6'
  });

  onProgress?.('מסכם פרופיל...', 85);

  // ── Step 3: Validate + build profile ─────────────────────────────────────
  const str = (v) => (typeof v === 'string' && v.trim()) ? v.trim() : '';
  const arr = (v) => (Array.isArray(v) && v.length > 0) ? v.filter(s => s && typeof s === 'string') : [];

  const profile = {
    // writing
    language_style:         str(result.language_style),
    sentence_patterns:      str(result.sentence_patterns),
    question_style:         str(result.question_style),
    question_openings:      arr(result.question_openings),
    explanation_style:      str(result.explanation_style),
    structure_preference:   str(result.structure_preference),
    tone:                   str(result.tone),
    formatting_habits:      str(result.formatting_habits),
    key_vocabulary:         arr(result.key_vocabulary),
    recurring_phrases:      arr(result.recurring_phrases),
    sample_sentences:       arr(result.sample_sentences),
    // pedagogy
    pedagogical_approach:   str(result.pedagogical_approach),
    teaching_methods:       arr(result.teaching_methods),
    difficulty_calibration: str(result.difficulty_calibration),
    topics_covered:         arr(result.topics_covered),
    emphasis_patterns:      str(result.emphasis_patterns),
    assessment_style:       str(result.assessment_style),
    learning_progression:   str(result.learning_progression),
    motivational_elements:  str(result.motivational_elements),
    // meta
    items_count:    richItems.length,
    exams_count:    exams.length,
    spoken_count:   spoken.length,
    sample_titles:  sampleTitles,
    samples_chars:  allSamples.length,
    generated_at:   new Date().toISOString(),
  };

  await saveStyleProfile(profile);
  onProgress?.('הסתיים!', 100);
  return profile;
}

// ─── Prompt injection ─────────────────────────────────────────────────────────
/**
 * Builds the style instruction block injected into every AI generation prompt.
 * The more fields filled, the richer the instruction.
 */
export function buildStyleInstruction(profile) {
  if (!profile) return '';

  const vocabList   = (profile.key_vocabulary   || []).slice(0, 12).join(' | ');
  const phraseList  = (profile.recurring_phrases || []).slice(0, 6).join(' | ');
  const methodList  = (profile.teaching_methods  || []).slice(0, 5).join(', ');
  const sampleQ     = (profile.question_openings || []).slice(0, 4).join(' / ');
  const sampleSents = (profile.sample_sentences  || []).map((s, i) => `  ${i+1}. "${s}"`).join('\n');

  return `╔══════════════════════════════════════════════════════╗
║        פרופיל הסגנון הייחודי של המורה — חובה לאמץ       ║
╚══════════════════════════════════════════════════════╝

🖊️ סגנון כתיבה ושפה:
• שפה כללית: ${profile.language_style}
• מבנה משפטים: ${profile.sentence_patterns}
• ניסוח הסברים: ${profile.explanation_style}
• מבנה ועיצוב: ${profile.structure_preference}
• הרגלי פורמט: ${profile.formatting_habits}
• טון: ${profile.tone}

❓ סגנון שאלות:
• אופי השאלות: ${profile.question_style}
• פתיחות אופייניות: ${sampleQ || '—'}

📚 גישה פדגוגית:
• גישה כללית: ${profile.pedagogical_approach}
• שיטות הוראה: ${methodList || '—'}
• רמת קושי: ${profile.difficulty_calibration}
• הדגשים חוזרים: ${profile.emphasis_patterns}
• אופי מבחנים: ${profile.assessment_style}
• דרגתיות לימוד: ${profile.learning_progression}
• מרכיבי מוטיבציה: ${profile.motivational_elements}

📝 אוצר מילים ייחודי:
${vocabList}
${phraseList ? `ביטויים חוזרים: ${phraseList}` : ''}

✍️ משפטים לדוגמה בסגנון המורה (חקה את האופן הזה בדיוק):
${sampleSents || '—'}

⚠️ הנחיות יישום — חובה:
1. כתוב בדיוק בסגנון ובטון המתוארים לעיל
2. השתמש באוצר המילים ובביטויים האופייניים
3. אמץ את מבנה המשפטים ואת דפוסי הניסוח
4. שמור על רמת הקושי: ${profile.difficulty_calibration || 'בהתאם לחומר'}
5. כל תוכן — מבוסס על החומרים שסופקו בלבד, ללא המצאות`.trim();
}