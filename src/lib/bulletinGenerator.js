import { base44 } from '@/api/base44Client';

// ── Weekly bulletin generator ────────────────────────────────────────────────
// Gathers the CurriculumWeek + the week's lessons (WeeklyPlan / weekly schedule)
// and asks the AI Gateway to draft a Hebrew parent bulletin, then persists a
// draft WeeklyBulletin record. Reuses the existing InvokeLLM integration,
// CurriculumWeek and WeeklyPlan entities — no new infra.

const BULLETIN_GEN_SCHEMA = {
  type: 'object',
  properties: {
    digest_summary: { type: 'string', description: 'סיכום שבועי קצר בעברית, פסקה אחת, פנייה חמה להורים' },
    study_points: { type: 'array', items: { type: 'string' }, description: 'מערך משפטים קצרים — מה נלמד בפועל השבוע' },
    recap_questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer'],
      },
      description: 'שאלות חזרה קלות שהורה יכול לשאול את ילדו, עם תשובה קצרה',
    },
    activities: { type: 'array', items: { type: 'string' }, description: 'פעילויות שבוצעו או רלוונטיות לשבוע' },
    weekly_riddle: { type: 'string', description: 'חידת שבוע אחת מתאימה לקהל דתי' },
    weekly_riddle_answer: { type: 'string', description: 'תשובת חידת השבוע' },
  },
  required: ['digest_summary', 'study_points', 'recap_questions'],
};

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d;
}

async function fetchCurriculumWeek(weekKey) {
  try {
    const exact = await base44.entities.CurriculumWeek.filter({ week_start: weekKey });
    if (exact?.length) return exact[0];
    const all = await base44.entities.CurriculumWeek.list('-week_start', 500);
    return (all || []).find((c) => c.week_start <= weekKey) || (all && all[0]) || null;
  } catch {
    return null;
  }
}

async function fetchWeekLessons(weekKey) {
  try {
    const plans = await base44.entities.WeeklyPlan.filter({ week_start: weekKey });
    const lessons = [];
    for (const plan of plans || []) {
      for (const dayBlock of plan.days || []) {
        for (const item of dayBlock.items || []) {
          lessons.push({
            day: dayBlock.day_key,
            hour: item.hour,
            title: item.title,
            subject: item.subject,
            notes: item.notes,
          });
        }
      }
    }
    return lessons;
  } catch {
    return [];
  }
}

/**
 * Generates a draft WeeklyBulletin for the week containing `weekStartInput`
 * (any date; normalized to its Sunday). Returns the created bulletin record.
 */
export async function generateWeeklyBulletin(weekStartInput) {
  const weekStart = getWeekStart(weekStartInput);
  const weekKey = ymd(weekStart);

  const [curriculumWeek, lessons] = await Promise.all([
    fetchCurriculumWeek(weekKey),
    fetchWeekLessons(weekKey),
  ]);

  const goalsText = (curriculumWeek?.parsed_goals || [])
    .map((g, i) => `${i + 1}. ${g.description || ''}${g.source_type ? ` (${g.source_type})` : ''}`)
    .filter(Boolean)
    .join('\n') || curriculumWeek?.free_text_goals || '(לא צוינו יעדים)';

  const lessonsText = lessons.length
    ? lessons.map((l) => `- ${l.day || ''} שעה ${l.hour || ''}: ${[l.title, l.subject].filter(Boolean).join(' — ')}${l.notes ? ` · ${l.notes}` : ''}`).join('\n')
    : '(אין שיעורים מתוכננים במערכת השעות)';

  const prompt = [
    'אתה מורה במוסד חינוכי דתי. נסח בעברית חוברת קשר שבועית להורים לפי הנתונים הבאים.',
    '',
    `שבוע של: ${weekKey}`,
    `מקצוע/מסכת: ${curriculumWeek?.subject || '(לא צוין)'}`,
    '',
    'יעדי השבוע:',
    goalsText,
    '',
    'שיעורי השבוע (ממערכת השעות):',
    lessonsText,
    '',
    `הערות המורה: ${curriculumWeek?.notes || '(אין)'}`,
    '',
    'החוברת כוללת: digest_summary (סיכום שבועי קצר), study_points (נקודות שנלמדו בפועל), recap_questions (שאלות חזרה עם תשובה להורים), activities (פעילויות), weekly_riddle ו-weekly_riddle_answer (חידת שבוע אחת).',
    'כתיבה חמה, מכבדת ומתאימה לקהל חרדי/דתי. ללא לשון חולין. תשובות החזרה קצרות וברורות.',
  ].join('\n');

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: BULLETIN_GEN_SCHEMA,
  });
  const data = result?.output || result || {};

  const endDate = ymd(new Date(weekStart.getTime() + 6 * 86400000));

  const bulletin = await base44.entities.WeeklyBulletin.create({
    start_date: weekKey,
    end_date: endDate,
    digest_summary: data.digest_summary || '',
    study_points: data.study_points || [],
    recap_questions: data.recap_questions || [],
    activities: data.activities || [],
    weekly_riddle: data.weekly_riddle || '',
    weekly_riddle_answer: data.weekly_riddle_answer || '',
    status: 'draft',
  });

  return bulletin;
}