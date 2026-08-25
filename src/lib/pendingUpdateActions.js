import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const STATUS_LABELS = {
  present: 'נוכח',
  absent: 'נעדר',
  late: 'מאחר',
};

const INTENT_LABELS = {
  add_student: 'תלמיד חדש',
  mark_attendance: 'נוכחות',
  add_grade: 'ציון',
  add_task: 'משימה',
  add_behavior: 'אירוע התנהגות',
  add_homework: 'שיעור בית',
  document_ingest: 'מסמך שהועלה',
  daily_log: 'תיעוד יומי',
  incident: 'אירוע חריג',
  calendar_event: 'אירוע בלוח',
  parent_contact: 'קשר הורים',
};

const CONTACT_TYPE_LABELS = {
  call: 'שיחת טלפון',
  meeting: 'פגישה',
  message: 'הודעה',
  email: 'אימייל',
  note: 'רישום',
};

const EVENT_TYPE_LABELS = {
  trip: 'טיול',
  assembly: 'אסיפה',
  holiday: 'חג/אירוע',
  meeting: 'פגישה',
  exam: 'מבחן',
  deadline: 'מועד אחרון',
  celebration: 'חגיגה',
  other: 'אחר',
};

export function getIntentLabel(intent) {
  return INTENT_LABELS[intent] || intent;
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function buildSummary(intent, action) {
  switch (intent) {
    case 'add_grade':
      return `ציון ${action.score ?? '—'} ב${action.subject || 'כללי'}${action.student_name ? ' — ' + action.student_name : ''}`;
    case 'mark_attendance':
      return `נוכחות: ${action.student_name || ''} — ${STATUS_LABELS[action.status] || action.status || ''}`;
    case 'add_behavior':
      return `אירוע התנהגות: ${action.student_name || ''}${action.description ? ' — ' + action.description : ''}`;
    case 'add_task':
      return `משימה: ${action.title || ''}`;
    case 'add_homework':
      return `שיעור בית: ${action.title || ''}`;
    case 'add_student':
      return `תלמיד חדש: ${action.student_name || ''}`;
    case 'document_ingest':
      return action.summary || action.fileName || 'מסמך שהועלה';
    case 'daily_log':
      return `תיעוד יומי: ${(action.log_text || '').slice(0, 60)}${(action.log_text || '').length > 60 ? '…' : ''}`;
    case 'incident':
      return `אירוע חריג: ${action.student_name || ''}${action.description ? ' — ' + action.description : ''}${action.severity ? ` (${action.severity})` : ''}`;
    case 'calendar_event':
      return `אירוע בלוח: ${action.event_title || ''}${action.event_date ? ' — ' + action.event_date : ''}`;
    case 'parent_contact':
      return `קשר הורים: ${action.student_name || ''}${action.contact_type ? ' — ' + (CONTACT_TYPE_LABELS[action.contact_type] || action.contact_type) : ''}`;
    default:
      return 'פעולה מוצעת';
  }
}

/**
 * Executes a pending update by creating the actual entity.
 * Returns the entity name that was created.
 */
export async function executePendingUpdate(pending) {
  const action = pending.payload || {};
  const today = format(new Date(), 'yyyy-MM-dd');

  switch (pending.intent) {
    case 'add_student': {
      const name = action.student_name?.trim();
      if (!name) throw new Error('חסר שם תלמיד');
      await base44.entities.Student.create({ name });
      return 'Student';
    }
    case 'mark_attendance': {
      if (!action.student_id) throw new Error('נדרש לבחור תלמיד');
      await base44.entities.Attendance.create({
        student_id: action.student_id,
        date: action.date || today,
        status: action.status || 'absent',
      });
      return 'Attendance';
    }
    case 'add_grade': {
      if (!action.student_id) throw new Error('נדרש לבחור תלמיד');
      if (action.score == null) throw new Error('נדרש ציון');
      const score = Number(action.score);
      const maxScore = Number(action.max_score) || 100;
      // AI-derived (or otherwise untrusted) input reaches this point with
      // no schema-level bounds check — Grade.score has no min/max
      // constraint in base44/entities/Grade.jsonc, it's documentation-only
      // ("0-100" in the description). Validate here, at the point of
      // actual persistence, rather than trusting the LLM's structured
      // output or a client-side <input max=200> that nothing enforces
      // server-side.
      if (!Number.isFinite(score) || score < 0 || score > maxScore) {
        throw new Error(`ציון לא תקין: ${action.score} (חייב להיות בין 0 ל-${maxScore})`);
      }
      await base44.entities.Grade.create({
        student_id: action.student_id,
        subject: action.subject || 'כללי',
        score,
        date: action.date || today,
        test_name: action.test_name || '',
        max_score: maxScore,
        period: action.period || 'exam',
        notes: action.notes || '',
      });
      return 'Grade';
    }
    case 'add_task': {
      if (!action.title) throw new Error('חסר תוכן המשימה');
      await base44.entities.Task.create({
        title: action.title,
        student_id: action.student_id || undefined,
        subject: action.subject || undefined,
        due_date: action.due_date || undefined,
        priority: action.priority || 'medium',
        status: 'pending',
      });
      return 'Task';
    }
    case 'add_behavior': {
      if (!action.student_id) throw new Error('נדרש לבחור תלמיד');
      await base44.entities.BehaviorEvent.create({
        student_id: action.student_id,
        student_name: action.student_name || '',
        type: action.behavior_type || action.type || 'neutral',
        category: action.behavior_category || action.category || 'other',
        description: action.description || '',
        severity: action.severity || 'low',
        date: action.date || new Date().toISOString(),
      });
      return 'BehaviorEvent';
    }
    case 'add_homework': {
      if (!action.title) throw new Error('חסר תוכן שיעור הבית');
      await base44.entities.HomeworkAssignment.create({
        title: action.title,
        subject: action.subject || undefined,
        due_date: action.due_date || undefined,
        type: 'homework',
      });
      return 'HomeworkAssignment';
    }
    case 'incident': {
      // אירוע חריג לתלמיד → אירוע התנהגות עם חומרה. התלמיד חייב להיות מזוהה
      // (ה-AI אמור היה לבקש הבהרה אחרת), אז מאמתים כאן בנקודת הכתיבה.
      if (!action.student_id) throw new Error('נדרש לבחור תלמיד לאירוע החריג');
      await base44.entities.BehaviorEvent.create({
        student_id: action.student_id,
        student_name: action.student_name || '',
        type: action.behavior_type || 'concern',
        category: action.behavior_category || 'other',
        description: action.description || action.log_text || '',
        severity: action.severity || 'medium',
        date: action.date || new Date().toISOString(),
      });
      return 'BehaviorEvent';
    }
    case 'calendar_event': {
      if (!action.event_title) throw new Error('חסרה כותרת האירוע');
      if (!action.event_date) throw new Error('חסר תאריך האירוע');
      // SchoolEvent.start_date הוא date-time; מאפשרים גם תאריך קצר (YYYY-MM-DD).
      const startDate = action.event_date?.length === 10
        ? `${action.event_date}T09:00:00`
        : action.event_date;
      await base44.entities.SchoolEvent.create({
        title: action.event_title,
        type: action.event_type || 'other',
        start_date: startDate,
        end_date: startDate,
        description: action.event_description || '',
        location: action.event_location || '',
      });
      return 'SchoolEvent';
    }
    case 'parent_contact': {
      if (!action.student_id) throw new Error('נדרש לבחור תלמיד');
      await base44.entities.ParentContact.create({
        student_id: action.student_id,
        date: action.contact_date || today,
        type: action.contact_type || 'note',
        summary: action.contact_summary || action.description || '',
        parent_name: action.parent_name || '',
        initiated_by: 'teacher',
      });
      return 'ParentContact';
    }
    case 'daily_log': {
      // תיעוד יומי כללי → נרשם כמשימה שכבר בוצעה (סטטוס done) תחת נושא "יומן יומי".
      // זהו הכלי הנייטרלי הקיים שמאפשר טקסט חופשי וזמין למורה (לא מזהם את
      // לוח האירועים/ההתנהגות), ומופיע בריכוז המשימות לצפייה ואחזור.
      const text = (action.log_text || action.description || '').trim();
      if (!text) throw new Error('חסר תוכן התיעוד היומי');
      await base44.entities.Task.create({
        title: text.slice(0, 120),
        description: text,
        subject: 'יומן יומי',
        due_date: action.log_date || today,
        priority: 'low',
        status: 'done',
      });
      return 'Task';
    }
    case 'document_ingest': {
      const { saveResult } = await import('@/lib/smartIngest');
      const students = await base44.entities.Student.list();
      const student = students.find(s => s.id === action.selectedStudentId);
      const resultToSave = {
        ...action,
        selectedCategory: action.selectedCategory || action.category,
        selectedStudentId: action.selectedStudentId,
      };
      await saveResult(resultToSave, student);
      return 'DocumentIngest';
    }
    default:
      throw new Error('פעולה לא מוכרת');
  }
}