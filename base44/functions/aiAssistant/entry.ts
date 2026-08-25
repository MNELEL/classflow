import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { gatherOrchestratorContext, summarizeContextForAI } from '../../shared/orchestratorContext.ts';

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
- זהה את הכוונה (intent) מתוך: add_student, mark_attendance, add_grade, add_task, add_behavior, add_homework, query_student_info, natural_query, daily_log, incident, calendar_event, parent_contact, unknown.
- עבור natural_query: המשתמש שואל שאלה פתוחה על מצב הכיתה/תלמיד — למשל "מי מתקשה הכי הרבה?", "איך המצב של דני?", "מי נעדר הכי הרבה החודש?", "מה קרה היום/אתמול?". ענה בשדה reply על בסיס תקציב מצב הכיתה והעדכונים האחרונים שקיבלת. התשובה תהיה פסקה קצרה, ממוקדת ומועילה, בעברית. ציין תלמידים ספציפיים לפי השם כשרלוונטי, והסתמך גם על recent_updates כדי לגשר על מה שהמורה כבר סיפר קודם.
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
- עבור add_student, שים את השם ב-student_name (ללא student_id).
- עבור mark_attendance: סטטוס יכול להיות present (נוכח), absent (נעדר), late (מאחר). אם לא מצוין תאריך, השאר את date ריק (יוצר כהיום). אם לא ברור לאיזה יום (היום/אתמול/מחר), הגדר needs_clarification=true עם שאלת הבהרה קצרה ואל תבצע.
- עבור add_grade: חלץ מקצוע (subject) וציון (score 0-100). אם חסר תלמיד או ציון — הגדר needs_clarification=true.
- עבור add_task/add_homework: חלץ כותרת (title). אם יש תאריך יעד, פרמט אותו כ-YYYY-MM-DD.
- עבור add_behavior: חלץ סוג (behavior_type: positive/negative/neutral/improvement/concern) ותיאור (description).
- עבור incident (אירוע חריג לתלמיד): התלמיד חייב להיות מצוין/מזוהה. חלץ behavior_type (ברירת מחדל concern), category (ברירת מחדל other), severity (low/medium/high, ברירת מחדל medium), ותיאור (description). אם לא מזוהה תלמיד — needs_clarification=true.
- עבור calendar_event (אירוע בלוח האירועים): חלץ event_title, event_type (trip/assembly/holiday/meeting/exam/deadline/celebration/other), event_date (YYYY-MM-DD או מחרוזת תאריך-שעה), event_description, event_location (אופציונלי). אם חסר תאריך או כותרת — needs_clarification=true.
- עבור parent_contact (רישום קשר הורים): התלמיד חייב להיות מזוהה. חלץ contact_type (call/meeting/message/email/note), contact_summary (תוכן הפנייה), contact_date (YYYY-MM-DD, ברירת מחדל היום). אם לא מזוהה תלמיד — needs_clarification=true.
- עבור daily_log (תיעוד יומי / מה היה היום): השתמש רק כשהמורה מתאר/ת את מהלך היום באופן כללי שאינו מתפרק לכוונה ספציפית אחת. אם מהטקסט עולים פרטים ספציפיים (תלמיד מסוים, ציון, נעדר, אירוע) — העדף את הכוונה הספציפית. חלץ log_text (תוכן התיעוד) ו-log_date (YYYY-MM-DD, ברירת מחדל היום).
- עבור תלמיד קיים, התאם את השם ל-ID מהרשימה ומלא את student_id. אם השם לא נמצא, השאר את student_id ריק ושים את השם ב-student_name. כשיש כמה תלמידים בעלי שם זהה או שלא ברור למי התכוון המורה — הגדר needs_clarification=true עם שאלה קצרה.
- אם הפקודה לא ברורה או לא ניתנת לביצוע, החזר intent="unknown".`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: ['add_student', 'mark_attendance', 'add_grade', 'add_task', 'add_behavior', 'add_homework', 'query_student_info', 'natural_query', 'daily_log', 'incident', 'calendar_event', 'parent_contact', 'unknown'] },
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
          priority: { type: 'string', enum: ['low', 'medium', 'high'] }
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

    // Build human-readable summary per intent (incl. new ones)
    const summaries: Record<string, string> = {
      add_grade: `ציון ${action.score ?? '—'} ב${action.subject || 'כללי'}${action.student_name ? ' — ' + action.student_name : ''}`,
      mark_attendance: `נוכחות: ${action.student_name || ''} — ${action.status === 'absent' ? 'נעדר' : action.status === 'late' ? 'מאחר' : 'נוכח'}`,
      add_behavior: `אירוע התנהגות: ${action.student_name || ''}${action.description ? ' — ' + action.description : ''}`,
      add_task: `משימה: ${action.title || ''}`,
      add_homework: `שיעור בית: ${action.title || ''}`,
      add_student: `תלמיד חדש: ${action.student_name || ''}`,
      daily_log: `תיעוד יומי: ${(action.log_text || '').slice(0, 60)}${(action.log_text || '').length > 60 ? '…' : ''}`,
      incident: `אירוע חריג: ${action.student_name || ''}${action.description ? ' — ' + action.description : ''}${action.severity ? ` (${action.severity})` : ''}`,
      calendar_event: `אירוע בלוח: ${action.event_title || ''}${action.event_date ? ' — ' + action.event_date : ''}`,
      parent_contact: `קשר הורים: ${action.student_name || ''}${action.contact_type ? ' — ' + action.contact_type : ''}`,
    };

    // Save as pending update for review — does NOT execute yet
    const pending = await base44.entities.PendingUpdate.create({
      intent: action.intent,
      payload: action,
      summary: summaries[action.intent] || 'פעולה מוצעת',
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