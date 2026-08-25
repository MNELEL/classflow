import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { gatherOrchestratorContext, summarizeContextForAI } from '../../shared/orchestratorContext.ts';

// Known in-app routes the assistant can navigate to. Kept short on purpose
// — the LLM picks one of these so it never returns a path that 404s.
const KNOWN_ROUTES = [
  '/', '/students', '/attendance', '/grades', '/library', '/homework',
  '/tasks-hub', '/review', '/exams', '/events', '/curriculum',
  '/weekly-schedule', '/sound-board', '/fast-feedback', '/behavior-timeline',
  '/parents', '/settings', '/analytics', '/raffle', '/certificates',
  '/daily-summary', '/weekly-bulletin', '/weekly-tasks', '/more',
];

// Per-intent human summary. Shared between the single-intent path and the
// bulk daily-log path so each generated PendingUpdate reads consistently.
function buildSummary(intent: string, a: any): string {
  switch (intent) {
    case 'add_grade':
      return `ציון ${a.score ?? '—'} ב${a.subject || 'כללי'}${a.student_name ? ' — ' + a.student_name : ''}`;
    case 'mark_attendance':
      return `נוכחות: ${a.student_name || ''} — ${a.status === 'absent' ? 'נעדר' : a.status === 'late' ? 'מאחר' : 'נוכח'}`;
    case 'add_behavior':
      return `אירוע התנהגות: ${a.student_name || ''}${a.description ? ' — ' + a.description : ''}`;
    case 'add_task':
      return `משימה: ${a.title || ''}`;
    case 'add_homework':
      return `שיעור בית: ${a.title || ''}`;
    case 'add_student':
      return `תלמיד חדש: ${a.student_name || ''}`;
    case 'daily_log':
      return `תיעוד יומי: ${(a.log_text || '').slice(0, 60)}${(a.log_text || '').length > 60 ? '…' : ''}`;
    case 'incident':
      return `אירוע חריג: ${a.student_name || ''}${a.description ? ' — ' + a.description : ''}${a.severity ? ` (${a.severity})` : ''}`;
    case 'calendar_event':
      return `אירוע בלוח: ${a.event_title || ''}${a.event_date ? ' — ' + a.event_date : ''}`;
    case 'parent_contact':
      return `קשר הורים: ${a.student_name || ''}${a.contact_type ? ' — ' + a.contact_type : ''}`;
    default:
      return 'פעולה מוצעת';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const command = body?.command;
    // `voice` is passed by AssistantDock when the input came from speech
    // recognition — kept on the record so the review screen can show it.
    const source = body?.voice ? 'voice_command' : 'text_command';
    if (!command || typeof command !== 'string') {
      return Response.json({ error: 'נדרש טקסט פקודה' }, { status: 400 });
    }

    // Gather full cross-module "brain" context so the assistant can answer
    // natural questions about class status, not just CRUD commands.
    const ctx = await gatherOrchestratorContext(base44);
    const students = ctx.students;
    const studentRoster = students.map(s => ({
      id: s.id,
      name: s.name,
      custom_fields: s.custom_fields || {},
    }));
    const aiSummary = summarizeContextForAI(ctx);

    const todayISO = ctx.today;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה ה"מוח הפדגוגי" והעוזר האישי למורה במערכת ClassFlow. נתח את הפקודה הבאה והחזר פעולה מובנית או תשובה טבעית.

רשימת תלמידים (ID + שם + שדות מותאמים):
${JSON.stringify(studentRoster)}

תאריך היום: ${todayISO}

תקציר מצב הכיתה (מכל המודולים — ציונים, נוכחות, משימות, התנהגות, שיעורים, מבחנים, אירועים, עדכונים אחרונים):
${JSON.stringify(aiSummary).slice(0, 6000)}

פקודת המשתמש: "${command}"

כללים:
- זהה את הכוונה (intent) מתוך: add_student, mark_attendance, add_grade, add_task, add_behavior, add_homework, query_student_info, natural_query, daily_log, incident, calendar_event, parent_contact, bulk_daily_log, navigate, save_note, query_notes, resolve_note, unknown.
- עבור bulk_daily_log (יומן יומי בבת אחת): המורה מתאר/ת פסקה שלמה של מה שקרה היום — מספר דברים יחד (נוכחות, ציונים, אירועים, קשר הורים, משימות, תיעוד כללי). פרק את הפסקה לרשימת פעולות נפרדות בשדה items. כל פריט ב-items יקבל intent משלו מתוך: mark_attendance, add_grade, add_behavior, add_task, add_homework, incident, parent_contact, calendar_event, daily_log — ואת השדות המתאימים לאותה כוונה (בדיוק כמו פקודה בודדת). אל תשתמש ב-bulk_daily_log אם מדובר בפעולה אחת בלבד — אז החזר את הכוונה הספציפית. אל תמציא נתונים — רק מה שעולה מהטקסט.
- עבור natural_query: המשתמש שואל שאלה פתוחה על מצב הכיתה/תלמיד — למשל "מי מתקשה הכי הרבה?", "איך המצב של דני?", "מי נעדר הכי הרבה החודש?", "מה קרה היום/אתמול?". ענה בשדה reply על בסיס תקציר מצב הכיתה והעדכונים האחרונים שקיבלת. התשובה תהיה פסקה קצרה, ממוקדת ומועילה, בעברית. ציין תלמידים ספציפיים לפי השם כשרלוונטי, והסתמך גם על recent_updates כדי לגשר על מה שהמורה כבר סיפר קודם.
- עבור query_student_info: המשתמש שואל על פרטי תלמיד — יום הולדת, טלפון אב/אם, ת"ז אב/אם/תלמיד, אימייל או כתובת. מלא את student_id ואת query_field לפי השאלה:
    • יום הולדת / מתי נולד → query_field="birth_date"
    • טלפון אב / טלפון האב / אבא → query_field="father_phone"
    • טלפון אם / טלפון האם / אמא → query_field="mother_phone"
    • טלפון הורים / טלפון / פלאפון → query_field="parent_phone"
    • ת"ז אב / תעודת זהות אב → query_field="father_id"
    • ת"ז אם / תעודת זהות אם → query_field="mother_id"
    • תעודת זהות / ת"ז (תלמיד) → query_field="id_number"
    • אימייל / מייל → query_field="email"
    • כתובת → query_field="address"
    • כל הפרטים / פרטים → query_field="all"
- עבור navigate (ניווט בקול/טקסט): המורה מבקש/ת לעבור/לפתוח מסך — "פתח/קח אותי ל...", "לך ל...", "פתח את הציונים/הנוכחות/הספרייה". החזר route — נתיב יחסי מתוך הרשימה: ${KNOWN_ROUTES.join(' ')}. אם המורה מזכיר תלמיד בשם ורוצה לפתוח את הפרופיל שלו, החזר route="/students/<student_id>". אחרת החזר route ישירות מהרשימה. אל תמציא נתיבים שלא ברשימה.
- עבור save_note (הערה/שאלה אישית): המורה רוצה לרשום לעצמו הערה, תזכורת או שאלה פתוחה — "תזכורת: לבדוק מחר את דני", "יש לי שאלה — למה דני לא מגיש", "תזכור: לדבר עם אמא של רוני". מלא note_type ("question" לשאלה/תזכורת פתוחה, "note" להערה), note_content (תוכן מנוסח מחדש בקצרה), ואם רלוונטי note_student_id+note_student_name ו-note_tags.
- עבור query_notes (שליפת ההערות/השאלות שלי): המורה שואל "מה ההערות הפתוחות שלי?", "יש לי שאלות פתוחות?", "מה רשמתי על דני?". החזר note_query_scope: "open" (ברירת מחדל — פתוחות בלבד), "all" (הכל), או "by_student" (עם note_student_id אם ידוע).
- עבור resolve_note (סגירת הערה/שאלה): המורה מסמן שטיפל — "סגור את השאלה על דני", "טיפלתי בתזכורת על רוני", "סמן כטופל". מלא resolve_student_name ואם ידוע note_student_id.
- עבור add_student, שים את השם ב-student_name (ללא student_id).
- עבור mark_attendance: סטטוס יכול להיות present (נוכח), absent (נעדר), late (מאחר). אם לא מצוין תאריך, השאר את date ריק (יוצר כהיום). אם לא ברור לאיזה יום (היום/אתמול/מחר), הגדר needs_clarification=true עם שאלת הבהרה קצרה ואל תבצע.
- עבור add_grade: חלץ מקצוע (subject) וציון (score 0-100). אם חסר תלמיד או ציון — הגדר needs_clarification=true.
- עבור add_task/add_homework: חלץ כותרת (title). אם יש תאריך יעד, פרמט אותו כ-YYYY-MM-DD.
- עבור add_behavior: חלץ סוג (behavior_type: positive/negative/neutral/improvement/concern) ותיאור (description).
- עבור incident (אירוע חריג לתלמיד): התלמיד חייב להיות מצוין/מזוהה. חלץ behavior_type (ברירת מחדל concern), category (ברירת מחדל other), severity (low/medium/high, ברירת מחדל medium), ותיאור (description). אם לא מזוהה תלמיד — needs_clarification=true.
- עבור calendar_event (אירוע בלוח האירועים): חלץ event_title, event_type (trip/assembly/holiday/meeting/exam/deadline/celebration/other), event_date (YYYY-MM-DD או מחרוזת תאריך-שעה), event_description, event_location (אופציונלי). אם חסר תאריך או כותרת — needs_clarification=true.
- עבור parent_contact (רישום קשר הורים): התלמיד חייב להיות מזוהה. חלץ contact_type (call/meeting/message/email/note), contact_summary (תוכן הפנייה), contact_date (YYYY-MM-DD, ברירת מחדל היום). אם לא מזוהה תלמיד — needs_clarification=true.
- עבור daily_log (תיעוד יומי יחיד): השתמש רק כשהמורה מתאר/ת דבר כללי אחד שאינו מתפרק לכוונה ספציפית. חלץ log_text ו-log_date (YYYY-MM-DD, ברירת מחדל היום). אם יש מספר דברים — השתמש ב-bulk_daily_log.
- עבור תלמיד קיים, התאם את השם ל-ID מהרשימה ומלא את student_id. אם השם לא נמצא, השאר את student_id ריק ושים את השם ב-student_name. כשיש כמה תלמידים בעלי שם זהה או שלא ברור למי התכוון המורה — הגדר needs_clarification=true עם שאלה קצרה.
- אם הפקודה לא ברורה או לא ניתנת לביצוע, החזר intent="unknown".`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: ['add_student', 'mark_attendance', 'add_grade', 'add_task', 'add_behavior', 'add_homework', 'query_student_info', 'natural_query', 'daily_log', 'incident', 'calendar_event', 'parent_contact', 'bulk_daily_log', 'navigate', 'save_note', 'query_notes', 'resolve_note', 'unknown'] },
          needs_clarification: { type: 'boolean' },
          clarification_question: { type: 'string' },
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          query_field: { type: 'string', enum: ['birth_date', 'parent_phone', 'father_phone', 'mother_phone', 'id_number', 'father_id', 'mother_id', 'email', 'address', 'all'] },
          reply: { type: 'string' },
          status: { type: 'string', enum: ['present', 'absent', 'late'] },
          date: { type: 'string' },
          subject: { type: 'string' },
          score: { type: 'number' },
          max_score: { type: 'number' },
          test_name: { type: 'string' },
          period: { type: 'string' },
          notes: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          due_date: { type: 'string' },
          behavior_type: { type: 'string', enum: ['positive', 'negative', 'neutral', 'improvement', 'concern'] },
          behavior_category: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          // incident / daily_log
          log_text: { type: 'string' },
          log_date: { type: 'string' },
          // calendar_event
          event_title: { type: 'string' },
          event_type: { type: 'string', enum: ['trip', 'assembly', 'holiday', 'meeting', 'exam', 'deadline', 'celebration', 'other'] },
          event_date: { type: 'string' },
          event_description: { type: 'string' },
          event_location: { type: 'string' },
          // parent_contact
          contact_type: { type: 'string', enum: ['call', 'meeting', 'message', 'email', 'note'] },
          contact_summary: { type: 'string' },
          contact_date: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          // bulk_daily_log — array of independent proposed records
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                intent: { type: 'string', enum: ['mark_attendance', 'add_grade', 'add_behavior', 'add_task', 'add_homework', 'incident', 'parent_contact', 'calendar_event', 'daily_log'] },
                student_id: { type: 'string' },
                student_name: { type: 'string' },
                status: { type: 'string', enum: ['present', 'absent', 'late'] },
                date: { type: 'string' },
                subject: { type: 'string' },
                score: { type: 'number' },
                max_score: { type: 'number' },
                test_name: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                due_date: { type: 'string' },
                behavior_type: { type: 'string', enum: ['positive', 'negative', 'neutral', 'improvement', 'concern'] },
                behavior_category: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                contact_type: { type: 'string', enum: ['call', 'meeting', 'message', 'email', 'note'] },
                contact_summary: { type: 'string' },
                contact_date: { type: 'string' },
                event_title: { type: 'string' },
                event_type: { type: 'string', enum: ['trip', 'assembly', 'holiday', 'meeting', 'exam', 'deadline', 'celebration', 'other'] },
                event_date: { type: 'string' },
                event_description: { type: 'string' },
                event_location: { type: 'string' },
                log_text: { type: 'string' },
                log_date: { type: 'string' },
              }
            }
          },
          // navigate
          route: { type: 'string' },
          // save_note / query_notes / resolve_note
          note_type: { type: 'string', enum: ['note', 'question'] },
          note_content: { type: 'string' },
          note_student_id: { type: 'string' },
          note_student_name: { type: 'string' },
          note_tags: { type: 'array', items: { type: 'string' } },
          note_query_scope: { type: 'string', enum: ['open', 'all', 'by_student'] },
          resolve_student_name: { type: 'string' }
        },
        required: ['intent']
      }
    });

    const action = llmResult;

    // Clarification — ask a focused question, do NOT persist or execute.
    if (action.needs_clarification && action.clarification_question) {
      return Response.json({
        success: false,
        needs_clarification: true,
        message: action.clarification_question,
      });
    }

    // ---- Navigation -------------------------------------------------------
    if (action.intent === 'navigate') {
      const route = action.route || '/';
      return Response.json({ success: true, navigate: route, message: `פותח ${route}…` });
    }

    // ---- Personal notes / questions --------------------------------------
    if (action.intent === 'save_note') {
      const content = (action.note_content || '').trim();
      if (!content) {
        return Response.json({ success: false, message: 'לא קיבלתי תוכן להערה.' });
      }
      await base44.entities.TeacherNote.create({
        type: action.note_type || 'note',
        content,
        related_student_id: action.note_student_id || undefined,
        related_student_name: action.note_student_name || '',
        tags: action.note_tags || [],
      });
      const label = (action.note_type === 'question') ? 'שאלה' : 'הערה';
      return Response.json({ success: true, message: `נשמרה ${label}${action.note_student_name ? ' על ' + action.note_student_name : ''}: "${content}"` });
    }

    if (action.intent === 'query_notes') {
      const scope = action.note_query_scope || 'open';
      let notes: any[];
      if (scope === 'all') {
        notes = await base44.entities.TeacherNote.list('-created_date', 50);
      } else if (scope === 'by_student' && action.note_student_id) {
        notes = await base44.entities.TeacherNote.filter({ related_student_id: action.note_student_id }, '-created_date', 50);
      } else {
        notes = await base44.entities.TeacherNote.filter({ is_resolved: false }, '-created_date', 50);
      }
      if (!notes.length) {
        return Response.json({ success: true, message: scope === 'all' ? 'אין לך הערות שמורות.' : 'אין הערות/שאלות פתוחות כרגע.' });
      }
      const lines = notes.map((n: any) => {
        const icon = n.type === 'question' ? '❓' : '📝';
        const who = n.related_student_name ? ` (${n.related_student_name})` : '';
        const status = n.is_resolved ? ' ✓' : '';
        return `• ${icon} ${n.content}${who}${status}`;
      });
      return Response.json({ success: true, message: `ההערות שלך:\n${lines.join('\n')}` });
    }

    if (action.intent === 'resolve_note') {
      const filter: any = { is_resolved: false };
      if (action.note_student_id) filter.related_student_id = action.note_student_id;
      await base44.entities.TeacherNote.updateMany(filter, { $set: { is_resolved: true, resolved_at: new Date().toISOString() } });
      const who = action.resolve_student_name ? ' על ' + action.resolve_student_name : '';
      return Response.json({ success: true, message: `סומנו כטופל${who}.` });
    }

    // ---- Read queries -----------------------------------------------------
    if (action.intent === 'query_student_info') {
      const student = students.find(s => s.id === action.student_id);
      if (!student) {
        return Response.json({ success: false, message: action.student_name ? `לא מצאתי תלמיד בשם ${action.student_name}.` : 'לא מצאתי תלמיד תואם.' });
      }
      const cf = student.custom_fields || {};
      const FIELD_LABELS: Record<string, string> = {
        birth_date: 'יום הולדת',
        parent_phone: 'טלפון הורים',
        father_phone: 'טלפון אב',
        mother_phone: 'טלפון אם',
        id_number: 'תעודת זהות',
        father_id: 'ת"ז אב',
        mother_id: 'ת"ז אם',
        email: 'אימייל',
        address: 'כתובת',
      };
      if (action.query_field && action.query_field !== 'all' && action.query_field in FIELD_LABELS) {
        const val = cf[action.query_field];
        const msg = val
          ? `${FIELD_LABELS[action.query_field]} של ${student.name}: ${val}`
          : `אין רשום ${FIELD_LABELS[action.query_field]} עבור ${student.name}.`;
        return Response.json({ success: true, message: msg });
      }
      // "all" — list all known fields
      const parts: string[] = [];
      for (const k of Object.keys(FIELD_LABELS)) {
        if (cf[k]) parts.push(`${FIELD_LABELS[k]}: ${cf[k]}`);
      }
      const msg = parts.length
        ? `פרטי ${student.name}: ${parts.join(' • ')}`
        : `אין שדות מותאמים רשומים עבור ${student.name}.`;
      return Response.json({ success: true, message: msg });
    }

    if (action.intent === 'natural_query') {
      return Response.json({ success: true, message: action.reply || 'לא הצלחתי לנתח את מצב הכיתה מהנתונים הנוכחיים.' });
    }

    if (action.intent === 'unknown' || !action.intent) {
      return Response.json({ success: false, message: 'לא הצלחתי להבין את הפקודה. נסה לנסח אחרת, למשל: "סמן את דני נעדר", "איך המצב של רוני?" או "תעד: דני הרביץ את רוני היום".' });
    }

    // ---- Bulk daily log → many review proposals ---------------------------
    if (action.intent === 'bulk_daily_log') {
      const items = Array.isArray(action.items) ? action.items.filter(it => it && it.intent) : [];
      if (!items.length) {
        return Response.json({ success: false, message: 'לא הצלחתי לפרק את הטקסט לפעולות נפרדות. נסה לנסח אחרת.' });
      }
      const records = items.map((it: any) => ({
        intent: it.intent,
        payload: it,
        summary: buildSummary(it.intent, it),
        source,
        original_text: command,
        status: 'pending',
        student_name: it.student_name || '',
      }));
      const created = await base44.entities.PendingUpdate.bulkCreate(records);
      return Response.json({
        success: true,
        bulk: true,
        count: created.length,
        message: `יצרתי ${created.length} הצעות לסקירה — כל אחת מופיעה בנפרד לאישור ועריכה.`,
      });
    }

    // ---- Single write intent → one review proposal -----------------------
    const pending = await base44.entities.PendingUpdate.create({
      intent: action.intent,
      payload: action,
      summary: buildSummary(action.intent, action),
      source,
      original_text: command,
      status: 'pending',
      student_name: action.student_name || '',
    });

    return Response.json({
      success: true,
      pending: true,
      pending_id: pending.id,
      message: `הצעה נוצרה: ${pending.summary}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});