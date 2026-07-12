import { base44 } from '@/api/base44Client';

export const CATEGORIES = [
  { value: 'student_note', label: 'הערה על תלמיד', icon: 'FileText', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'class_journal', label: 'יומן כיתה', icon: 'BookOpen', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'grades_assessment', label: 'ציונים', icon: 'Award', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'personal_letter', label: 'מכתב אישי', icon: 'Mail', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
];

export function getCategoryConfig(value) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[0];
}

export const REQUIRES_STUDENT = ['student_note', 'grades_assessment', 'personal_letter'];

export const CLASSIFICATION_PROMPT = (studentNames) => `אתה עוזר הוראה חכם. נתח את התמונה/מסמך שהועלה וסווג אותו לאחת מהקטגוריות הבאות:

1. student_note — הערה ספציפית על תלמיד (פתק, תיעוד אירוע התנהגותי, משוב פרטני)
2. class_journal — צילום יומן כיתה (רישום נוכחות, מהלך שיעור, תיעוד יומיומי)
3. grades_assessment — ציונים והערכות (מבחן, בוחן, טופס הערכה עם ציון מספרי)
4. personal_letter — מכתב אישי שנשלח לתלמיד או להורים

רשימת התלמידים בכיתה (לעזרה בזיהוי שמות): ${studentNames || 'לא זמין'}

לאחר הסיווג, חלץ את הנתונים הרלוונטיים:
- זהה את שם התלמיד אם מופיע במסמך (בדיוק כפי שכתוב)
- כתוב תקציר קצר של תוכן המסמך ב-2-3 משפטים
- לציונים: חלץ ציון מספרי, ציון מקסימלי, מקצוע ושם מבחן
- להערות התנהגות: סווג את סוג ההתנהגות ורמת החומרה
- למכתבים: זהה את הנמען (הורה או תלמיד) ואת שם ההורה אם מופיע
- ליומן: זהה תאריך ונקודות מרכזיות

ענה בעברית בלבד.`;

export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: ['student_note', 'class_journal', 'grades_assessment', 'personal_letter'] },
    student_name: { type: 'string', description: 'שם התלמיד כפי שזוהה במסמך (ריק אם לא זוהה)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    summary: { type: 'string', description: 'תקציר קצר של תוכן המסמך' },
    subject: { type: 'string', description: 'מקצוע (לציונים והערכות)' },
    score: { type: 'number', description: 'ציון מספרי 0-100 (לציונים)' },
    max_score: { type: 'number', description: 'ציון מקסימלי אפשרי' },
    test_name: { type: 'string', description: 'שם המבחן או ההערכה' },
    behavior_type: { type: 'string', enum: ['positive', 'negative', 'neutral', 'improvement', 'concern'] },
    behavior_category: { type: 'string', enum: ['participation', 'homework', 'behavior', 'social', 'academic', 'attendance', 'other'] },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    recipient: { type: 'string', enum: ['parent', 'student', 'unknown'] },
    parent_name: { type: 'string', description: 'שם ההורה אם מופיע' },
    document_date: { type: 'string', description: 'תאריך בפורמט YYYY-MM-DD אם זוהה, אחרת ריק' },
    key_points: { type: 'array', items: { type: 'string' }, description: 'נקודות מרכזיות מהמסמך' }
  }
};

export function matchStudent(studentName, students) {
  if (!studentName?.trim() || !students?.length) return null;
  const normalized = studentName.trim();

  let match = students.find(s => s.name === normalized);
  if (match) return match;

  const firstName = normalized.split(' ')[0];
  match = students.find(s => s.name.includes(firstName) || firstName.includes(s.name.split(' ')[0]));
  if (match) return match;

  const parts = normalized.split(' ');
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    match = students.find(s => s.name.includes(lastName));
    if (match) return match;
  }

  return null;
}

export function detectGrouping(results) {
  const valid = results.filter(r => r.status !== 'error');
  if (valid.length < 2) return null;

  const byCategory = {};
  valid.forEach((r) => {
    const cat = r.selectedCategory || r.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  for (const [category, items] of Object.entries(byCategory)) {
    if (items.length < 2) continue;
    const times = items.map(i => i.fileLastModified || 0).sort();
    const span = times.length > 1 ? times[times.length - 1] - times[0] : 0;
    if (span <= 120000) {
      const catConfig = getCategoryConfig(category);
      return {
        category,
        categoryLabel: catConfig.label,
        resultIds: items.map(i => i.id),
        count: items.length,
        reason: `זוהו ${items.length} קבצים בקטגוריית "${catConfig.label}" שצולמו בזמנים קרובים. ייתכן שמדובר בחלקי אותו מסמך.`
      };
    }
  }
  return null;
}

export async function saveResult(result, matchedStudent) {
  const today = new Date().toISOString().split('T')[0];
  const category = result.selectedCategory || result.category;

  switch (category) {
    case 'student_note': {
      if (!matchedStudent) throw new Error('נדרש לבחור תלמיד');
      await base44.entities.BehaviorEvent.create({
        student_id: matchedStudent.id,
        student_name: matchedStudent.name,
        type: result.behavior_type || 'neutral',
        category: result.behavior_category || 'other',
        description: result.summary || '',
        severity: result.severity || 'low',
        date: new Date().toISOString(),
      });
      return 'BehaviorEvent';
    }
    case 'class_journal': {
      await base44.entities.LibraryItem.create({
        title: (result.summary || result.fileName || 'יומן כיתה').slice(0, 60),
        source_type: 'image',
        file_url: result.fileUrl,
        file_name: result.fileName,
        category: 'יומן כיתה',
        description: result.summary || '',
        ai_status: 'ready',
        ai_summary: result.summary || '',
        tags: ['יומן_כיתה', 'auto_ingested'],
      });
      return 'LibraryItem';
    }
    case 'grades_assessment': {
      if (!matchedStudent) throw new Error('נדרש לבחור תלמיד');
      if (result.score === undefined || result.score === null) throw new Error('נדרש ציון');
      await base44.entities.Grade.create({
        student_id: matchedStudent.id,
        subject: result.subject || 'כללי',
        test_name: result.test_name || `הערכה ${today}`,
        score: result.score,
        max_score: result.max_score || 100,
        date: result.document_date || today,
        period: 'exam',
        notes: result.summary || '',
      });
      return 'Grade';
    }
    case 'personal_letter': {
      if (!matchedStudent) throw new Error('נדרש לבחור תלמיד');
      await base44.entities.StudentPortfolioItem.create({
        student_id: matchedStudent.id,
        type: 'parent_letter',
        title: `מכתב אישי - ${matchedStudent.name}`,
        description: result.summary || '',
        file_url: result.fileUrl,
        file_name: result.fileName,
        date: result.document_date || today,
        tags: ['auto_ingested'],
      });
      return 'StudentPortfolioItem';
    }
    default:
      throw new Error('קטגוריה לא מוכרת');
  }
}