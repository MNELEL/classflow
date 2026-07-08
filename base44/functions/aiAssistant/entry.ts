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

    let result;
    switch (action.intent) {
      case 'add_student': {
        const name = action.student_name?.trim();
        if (!name) return Response.json({ success: false, message: 'חסר שם תלמיד' });
        result = await base44.entities.Student.create({ name });
        return Response.json({ success: true, message: `✅ נוסף תלמיד חדש: ${name}`, entity: 'Student' });
      }
      case 'mark_attendance': {
        if (!action.student_id) return Response.json({ success: false, message: `לא מצאתי תלמיד בשם "${action.student_name || ''}".` });
        const status = action.status || 'absent';
        result = await base44.entities.Attendance.create({
          student_id: action.student_id,
          date: todayISO,
          status,
        });
        const statusLabel = status === 'absent' ? 'נעדר' : status === 'late' ? 'מאחר' : 'נוכח';
        return Response.json({ success: true, message: `📋 נרשמה נוכחות: ${action.student_name || ''} — ${statusLabel}`, entity: 'Attendance' });
      }
      case 'add_grade': {
        if (!action.student_id) return Response.json({ success: false, message: `לא מצאתי תלמיד בשם "${action.student_name || ''}".` });
        if (action.score == null) return Response.json({ success: false, message: 'חסר ציון' });
        result = await base44.entities.Grade.create({
          student_id: action.student_id,
          subject: action.subject || 'כללי',
          score: action.score,
          date: action.due_date || todayISO,
        });
        return Response.json({ success: true, message: `🎓 נרשם ציון ${action.score} ב${action.subject || 'כללי'} ל${action.student_name || ''}`, entity: 'Grade' });
      }
      case 'add_task': {
        if (!action.title) return Response.json({ success: false, message: 'חסר תוכן המשימה' });
        result = await base44.entities.Task.create({
          title: action.title,
          student_id: action.student_id || undefined,
          subject: action.subject || undefined,
          due_date: action.due_date || undefined,
          priority: action.priority || 'medium',
          status: 'pending',
        });
        return Response.json({ success: true, message: `📝 נוספה משימה: ${action.title}`, entity: 'Task' });
      }
      case 'add_behavior': {
        if (!action.student_id) return Response.json({ success: false, message: `לא מצאתי תלמיד בשם "${action.student_name || ''}".` });
        result = await base44.entities.BehaviorEvent.create({
          student_id: action.student_id,
          student_name: action.student_name || '',
          type: action.behavior_type || 'neutral',
          description: action.description || action.title || '',
          date: new Date().toISOString(),
        });
        return Response.json({ success: true, message: `📊 נרשם אירוע התנהגות עבור ${action.student_name || ''}`, entity: 'BehaviorEvent' });
      }
      case 'add_homework': {
        if (!action.title) return Response.json({ success: false, message: 'חסר תוכן שיעור הבית' });
        result = await base44.entities.HomeworkAssignment.create({
          title: action.title,
          subject: action.subject || undefined,
          due_date: action.due_date || undefined,
          type: 'homework',
        });
        return Response.json({ success: true, message: `📚 נוסף שיעור בית: ${action.title}`, entity: 'HomeworkAssignment' });
      }
      default:
        return Response.json({ success: false, message: 'פעולה לא מוכרת' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});