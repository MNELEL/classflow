import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return Response.json({ error: 'נדרש טקסט פקודה' }, { status: 400 });
    }

    // Fetch students for name → ID resolution
    const students = await base44.entities.Student.list('-created_date', 300);
    const studentRoster = students.map(s => ({ id: s.id, name: s.name }));

    const todayISO = new Date().toISOString().slice(0, 10);

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר וירטואלי למורה במערכת ClassFlow. נתח את הפקודה הבאה והחזר פעולה מובנית.

רשימת תלמידים (ID + שם):
${JSON.stringify(studentRoster)}

תאריך היום: ${todayISO}

פקודת המשתמש: "${command}"

כללים:
- זהה את הכוונה (intent) מתוך: add_student, mark_attendance, add_grade, add_task, add_behavior, add_homework, unknown
- עבור תלמיד קיים, התאם את השם ל-ID מהרשימה ומלא את student_id. אם השם לא נמצא, השאר את student_id ריק ושים את השם ב-student_name.
- עבור add_student, שים את השם ב-student_name (ללא student_id).
- עבור mark_attendance: סטטוס יכול להיות present (נוכח), absent (נעדר), late (מאחר).
- עבור add_grade: חלץ מקצוע (subject) וציון (score 0-100).
- עבור add_task/add_homework: חלץ כותרת (title). אם יש תאריך יעד, פרמט אותו כ-YYYY-MM-DD.
- עבור add_behavior: חלץ סוג (behavior_type) ותיאור (description).
- אם הפקודה לא ברורה או לא ניתנת לביצוע, החזר intent="unknown".`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: ['add_student', 'mark_attendance', 'add_grade', 'add_task', 'add_behavior', 'add_homework', 'unknown'] },
          student_id: { type: 'string' },
          student_name: { type: 'string' },
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

    if (action.intent === 'unknown' || !action.intent) {
      return Response.json({ success: false, message: 'לא הצלחתי להבין את הפקודה. נסה לנסח אחרת, למשל: "סמן את דני נעדר" או "הוסף תלמיד חדש בשם רוני".' });
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