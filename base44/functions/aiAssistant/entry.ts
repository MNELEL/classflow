import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { gatherOrchestratorContext, summarizeContextForAI } from '../../shared/orchestratorContext.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { command } = await req.json();
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

תקציר מצב הכיתה (מכל המודולים — ציונים, נוכחות, משימות, התנהגות, שיעורים, מבחנים, אירועים):
${JSON.stringify(aiSummary).slice(0, 5000)}

פקודת המשתמש: "${command}"

כללים:
- זהה את הכוונה (intent) מתוך: add_student, mark_attendance, add_grade, add_task, add_behavior, add_homework, query_student_info, natural_query, unknown
- עבור natural_query: המשתמש שואל שאלה פתוחה על מצב הכיתה/תלמיד — למשל "מי מתקשה הכי הרבה?", "איך המצב של דני?", "מי נעדר הכי הרבה החודש?", "מה קורה בכיתה?". ענה בשדה reply על בסיס תקציר מצב הכיתה שקיבלת. התשובה תהיה פסקה קצרה, ממוקדת ומועילה, בעברית. ציין תלמידים ספציפיים לפי השם כשרלוונטי.
- עבור תלמיד קיים, התאם את השם ל-ID מהרשימה ומלא את student_id. אם השם לא נמצא, השאר את student_id ריק ושים את השם ב-student_name.
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
- עבור mark_attendance: סטטוס יכול להיות present (נוכח), absent (נעדר), late (מאחר).
- עבור add_grade: חלץ מקצוע (subject) וציון (score 0-100).
- עבור add_task/add_homework: חלץ כותרת (title). אם יש תאריך יעד, פרמט אותו כ-YYYY-MM-DD.
- עבור add_behavior: חלץ סוג (behavior_type) ותיאור (description).
- אם הפקודה לא ברורה או לא ניתנת לביצוע, החזר intent="unknown".`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: ['add_student', 'mark_attendance', 'add_grade', 'add_task', 'add_behavior', 'add_homework', 'query_student_info', 'natural_query', 'unknown'] },
          student_id: { type: 'string' },
          student_name: { type: 'string' },
          query_field: { type: 'string', enum: ['birth_date', 'parent_phone', 'father_phone', 'mother_phone', 'id_number', 'father_id', 'mother_id', 'email', 'address', 'all'] },
          reply: { type: 'string' },
          status: { type: 'string', enum: ['present', 'absent', 'late'] },
          subject: { type: 'string' },
          score: { type: 'number' },
          title: { type: 'string' },
          description: { type: 'string' },
          due_date: { type: 'string' },
          behavior_type: { type: 'string', enum: ['positive', 'negative', 'neutral', 'improvement', 'concern'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['intent']
      }
    });

    const action = llmResult;

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
      return Response.json({ success: false, message: 'לא הצלחתי להבין את הפקודה. נסה לנסח אחרת, למשל: "סמן את דני נעדר", "איך המצב של רוני?" או "מי מתקשה הכי הרבה בכיתה?".' });
    }

    // Build human-readable summary
    const summaries: Record<string, string> = {
      add_grade: `ציון ${action.score ?? '—'} ב${action.subject || 'כללי'}${action.student_name ? ' — ' + action.student_name : ''}`,
      mark_attendance: `נוכחות: ${action.student_name || ''} — ${action.status === 'absent' ? 'נעדר' : action.status === 'late' ? 'מאחר' : 'נוכח'}`,
      add_behavior: `אירוע התנהגות: ${action.student_name || ''}${action.description ? ' — ' + action.description : ''}`,
      add_task: `משימה: ${action.title || ''}`,
      add_homework: `שיעור בית: ${action.title || ''}`,
      add_student: `תלמיד חדש: ${action.student_name || ''}`,
    };

    // Save as pending update for review — does NOT execute yet
    const pending = await base44.entities.PendingUpdate.create({
      intent: action.intent,
      payload: action,
      summary: summaries[action.intent] || 'פעולה מוצעת',
      source: 'text_command',
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