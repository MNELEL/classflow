/**
 * "דף קשר" שבועי להורים — תבנית בסגנון המקובל בתלמודי תורה:
 * שער, הספק החומר לפי מקצועות, מבחנים והודעות, ודף חתימת הורים עם שדות הערכה.
 * הטיוטה נשמרת מקומית בדפדפן (לא בשרת) — כדי שהמורה יוכל לערוך בלי לחכות לרשת.
 */

export const WEEKLY_SUBJECTS = ['גמרא', 'משנה', 'תורה', 'נביא', 'הלכה'];

export const DEFAULT_EVAL_FIELDS = [
  'קריאה נכונה',
  'ביאורי מילים',
  'שקלא וטריא',
  'עזרה בבית',
  'התנהגות',
  'הערות',
];

export const DEFAULT_GUIDELINES = [
  'ודאו שכל העבודות בוצעו בספרים ובחוברות שסומנו בכיתה.',
  'תלמיד שהשלים עבודה בבית — יציג אותה למלמד למחרת לסימון.',
  'המבחנים נשארים בגמרא; יש לוודא שכל מבחן מוחזר חתום בידי ההורים.',
  'יש להחזיר את דף הקשר חתום ביום א׳ בבוקר.',
];

export function makeDefaultWeeklySheet({ className = '', teacherName = '', parasha = '', hebrewYear = '' } = {}) {
  return {
    className,
    teacherName,
    teacherPhone: '',
    parasha,
    hebrewYear,
    subjects: WEEKLY_SUBJECTS.map((subject) => ({ subject, content: '' })),
    exams: '',
    announcements: '',
    praise: '',
    guidelines: [...DEFAULT_GUIDELINES],
    evalFields: [...DEFAULT_EVAL_FIELDS],
    returnBy: 'יום א׳ בבוקר',
  };
}

const STORAGE_PREFIX = 'weekly-sheet:';

export function weeklySheetStorageKey(classId) {
  return `${STORAGE_PREFIX}${classId || 'general'}`;
}

/** קורא טיוטה שמורה מהדפדפן. מחזיר null כשאין טיוטה או שהיא פגומה. */
export function readWeeklySheetDraft(classId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(weeklySheetStorageKey(classId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.subjects)) return null;
    return { ...makeDefaultWeeklySheet({}), ...parsed };
  } catch {
    return null;
  }
}

export function writeWeeklySheetDraft(classId, draft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(weeklySheetStorageKey(classId), JSON.stringify(draft));
  } catch {
    /* אין מקום אחסון — ממשיכים בלי שמירה */
  }
}
