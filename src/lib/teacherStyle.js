/**
 * Teacher Style Engine
 * Deep-analyzes uploaded works, exams and lessons to fingerprint
 * the teacher's unique writing & pedagogical style, then injects
 * that fingerprint into every AI generation call.
 */

import { base44 } from '@/api/base44Client';

const STYLE_KEY   = 'classflow_teacher_style_v2';

// ─── Persistence ──────────────────────────────────────────────────────────────
export function loadStyleProfile() {
  try { return JSON.parse(localStorage.getItem(STYLE_KEY) || 'null'); }
  catch { return null; }
}
export function saveStyleProfile(profile) {
  localStorage.setItem(STYLE_KEY, JSON.stringify(profile));
}
export function clearStyleProfile() {
  localStorage.removeItem(STYLE_KEY);
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
 * Full deep-analysis of all rich library items.
 * Calls the LLM twice:
 *   1. Lexical / stylistic fingerprint
 *   2. Pedagogical pattern analysis
 * Then merges into one comprehensive profile.
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

  // Pick best representatives (prioritize exams & written material — richest style signal)
  const pickBest = (arr, n, charsEach = 700) =>
    arr.slice(0, n).map(i => {
      const content = getItemContent(i).slice(0, charsEach);
      const type = classifyItem(i);
      return `【${type === 'exam_or_worksheet' ? 'מבחן/דף עבודה' : type === 'spoken_lesson' ? 'שיעור מוקלט' : 'הערה כתובה'}】 "${i.title}" (${i.subject || i.category || ''})\n${content}`;
    }).join('\n\n---\n\n');

  const examSamples   = pickBest(exams,  4, 900);
  const spokenSamples = pickBest(spoken, 3, 700);
  const notesSamples  = pickBest(notes,  2, 600);
  const otherSamples  = pickBest(other,  2, 500);

  const allSamples = [examSamples, spokenSamples, notesSamples, otherSamples]
    .filter(Boolean).join('\n\n═══\n\n');

  onProgress?.('מנתח סגנון כתיבה...', 25);

  // ── Step 2a: Lexical / writing style analysis ──────────────────────────────
  const styleResult = await base44.integrations.Core.InvokeLLM({
    prompt: `אתה מומחה לניתוח סגנון כתיבה פדגוגי. לפניך חומרים שיצר מורה — מבחנים, דפי עבודה, שיעורים מוקלטים, הערות.
נתח לעומק את הסגנון הייחודי של המורה הזה/הזאת.

חומרי המורה:
${allSamples}

הוראות לניתוח:
• בחן את השפה, המבנה, הטון, ואוצר המילים בכל סוג חומר
• זהה דפוסים חוזרים בניסוח שאלות
• שים לב לאורך משפטים, מורכבות, ואופן הסבר מושגים
• זהה ביטויים ייחודיים שהמורה משתמש/ת בהם שוב ושוב
• שים לב לאיך המורה פותח/ת ומסיים/ת יחידות
• בדוק אם יש שימוש בדוגמאות מהחיים, אנלוגיות, הומור

החזר ניתוח מפורט:`,
    response_json_schema: {
      type: 'object',
      properties: {
        language_style:         { type: 'string', description: 'תיאור מפורט של סגנון השפה' },
        sentence_patterns:      { type: 'string', description: 'דפוסי משפטים אופייניים (ארוכים/קצרים, מבנה)' },
        question_style:         { type: 'string', description: 'איך המורה מנסח/ת שאלות' },
        question_openings:      { type: 'array', items: { type: 'string' }, description: 'פתיחות שאלות אופייניות' },
        explanation_style:      { type: 'string', description: 'איך המורה מסביר/ה מושגים' },
        structure_preference:   { type: 'string', description: 'העדפות מבניות' },
        tone:                   { type: 'string', description: 'טון כללי' },
        key_vocabulary:         { type: 'array', items: { type: 'string' }, description: 'מילות מפתח וביטויים אופייניים (עד 15)' },
        recurring_phrases:      { type: 'array', items: { type: 'string' }, description: 'ביטויים חוזרים ייחודיים' },
        sample_sentences:       { type: 'array', items: { type: 'string' }, description: '3 משפטים לדוגמה בסגנון המורה' },
        formatting_habits:      { type: 'string', description: 'הרגלי עיצוב ופורמט' },
      }
    },
    model: 'claude_sonnet_4_6'
  });

  onProgress?.('מנתח גישה פדגוגית...', 60);

  // ── Step 2b: Pedagogical analysis ─────────────────────────────────────────
  const pedagResult = await base44.integrations.Core.InvokeLLM({
    prompt: `אתה מומחה לפדגוגיה. נתח את הגישה הפדגוגית של המורה מהחומרים הבאים.

חומרי המורה:
${allSamples}

נתח:
• רמת קושי ושכבת גיל משוערת
• שיטות הוראה מועדפות
• כיצד בנויה הדרגתיות הלמידה
• אופי הבדיקה והמשוב
• נושאי הלב של המורה
• מה המורה מדגיש/ה שוב ושוב`,
    response_json_schema: {
      type: 'object',
      properties: {
        pedagogical_approach:   { type: 'string' },
        teaching_methods:       { type: 'array', items: { type: 'string' } },
        difficulty_calibration: { type: 'string', description: 'רמת קושי אופיינית ושכבת גיל' },
        topics_covered:         { type: 'array', items: { type: 'string' } },
        emphasis_patterns:      { type: 'string', description: 'מה המורה מדגיש שוב ושוב' },
        assessment_style:       { type: 'string', description: 'אופי המבחנים ודפי העבודה' },
        learning_progression:   { type: 'string', description: 'כיצד בנויה הדרגתיות' },
        motivational_elements:  { type: 'string', description: 'אלמנטים מעודדים ומניעים' },
      }
    },
    model: 'claude_sonnet_4_6'
  });

  onProgress?.('מסכם פרופיל...', 90);

  // ── Step 3: merge ──────────────────────────────────────────────────────────
  const profile = {
    // writing
    language_style:         styleResult.language_style,
    sentence_patterns:      styleResult.sentence_patterns,
    question_style:         styleResult.question_style,
    question_openings:      styleResult.question_openings || [],
    explanation_style:      styleResult.explanation_style,
    structure_preference:   styleResult.structure_preference,
    tone:                   styleResult.tone,
    key_vocabulary:         styleResult.key_vocabulary || [],
    recurring_phrases:      styleResult.recurring_phrases || [],
    sample_sentences:       styleResult.sample_sentences || [],
    formatting_habits:      styleResult.formatting_habits,
    // pedagogy
    pedagogical_approach:   pedagResult.pedagogical_approach,
    teaching_methods:       pedagResult.teaching_methods || [],
    difficulty_calibration: pedagResult.difficulty_calibration,
    topics_covered:         pedagResult.topics_covered || [],
    emphasis_patterns:      pedagResult.emphasis_patterns,
    assessment_style:       pedagResult.assessment_style,
    learning_progression:   pedagResult.learning_progression,
    motivational_elements:  pedagResult.motivational_elements,
    // meta
    items_count:  richItems.length,
    exams_count:  exams.length,
    spoken_count: spoken.length,
    generated_at: new Date().toISOString(),
  };

  saveStyleProfile(profile);
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