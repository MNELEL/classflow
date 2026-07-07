import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Daily reminder: checks homework/tasks due soon or overdue with pending submissions,
// and sends an email summary to each teacher.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow platform-scheduled invocations (no user context).
    // If invoked directly by a user, require admin.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const fmt = (d) => d.toISOString().split('T')[0];
    const todayStr = fmt(today);
    const tomorrowStr = fmt(tomorrow);

    // Fetch all homework and tasks (service role)
    const homework = await base44.asServiceRole.entities.HomeworkAssignment.list('-due_date', 500);
    const tasks = await base44.asServiceRole.entities.Task.list('-created_date', 500);
    const users = await base44.asServiceRole.entities.User.list();

    // Group actionable items by teacher (created_by_id)
    const byTeacher = {};

    for (const hw of homework) {
      const teacherId = hw.created_by_id;
      if (!teacherId) continue;

      const pendingSubs = (hw.submissions || []).filter(s => !s.submitted);
      if (pendingSubs.length === 0 && !hw.due_date) continue;

      const dueDate = hw.due_date ? new Date(hw.due_date) : null;
      const isOverdue = dueDate && dueDate < today && pendingSubs.length > 0;
      const isDueToday = hw.due_date === todayStr && pendingSubs.length > 0;
      const isDueTomorrow = hw.due_date === tomorrowStr && pendingSubs.length > 0;

      if (isOverdue || isDueToday || isDueTomorrow) {
        if (!byTeacher[teacherId]) byTeacher[teacherId] = { homework: [], tasks: [] };
        byTeacher[teacherId].homework.push({
          title: hw.title,
          subject: hw.subject || '',
          due_date: hw.due_date || 'ללא תאריך',
          pending_count: pendingSubs.length,
          status: isOverdue ? 'איחור' : (isDueToday ? 'היום' : 'מחר'),
        });
      }
    }

    for (const t of tasks) {
      const teacherId = t.created_by_id;
      if (!teacherId || t.status === 'done') continue;

      const isOverdue = t.due_date && new Date(t.due_date) < today;
      const isDueToday = t.due_date === todayStr;
      const isDueTomorrow = t.due_date === tomorrowStr;

      if (isOverdue || isDueToday || isDueTomorrow) {
        if (!byTeacher[teacherId]) byTeacher[teacherId] = { homework: [], tasks: [] };
        byTeacher[teacherId].tasks.push({
          title: t.title,
          subject: t.subject || '',
          due_date: t.due_date || 'ללא תאריך',
          status: isOverdue ? 'איחור' : (isDueToday ? 'היום' : 'מחר'),
        });
      }
    }

    const teacherIds = Object.keys(byTeacher);
    let emailsSent = 0;

    for (const teacherId of teacherIds) {
      const teacherUser = users.find(u => u.id === teacherId);
      if (!teacherUser?.email) continue;

      const data = byTeacher[teacherId];
      const lines = [];

      if (data.homework.length > 0) {
        lines.push('📚 מטלות לבדיקה / הגשה:');
        for (const hw of data.homework) {
          lines.push(`  • ${hw.title}${hw.subject ? ` (${hw.subject})` : ''} — ${hw.status} · ${hw.pending_count} לא הגישו · תאריך: ${hw.due_date}`);
        }
      }

      if (data.tasks.length > 0) {
        lines.push('');
        lines.push('✅ משימות לטיפול:');
        for (const t of data.tasks) {
          lines.push(`  • ${t.title}${t.subject ? ` (${t.subject})` : ''} — ${t.status} · תאריך: ${t.due_date}`);
        }
      }

      if (lines.length === 0) continue;

      const body = `שלום ${teacherUser.full_name || ''},\n\nהנה סיכום יומי של מטלות ומשימות שדורשות את תשומת לבך:\n\n${lines.join('\n')}\n\n— ClassFlow`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: teacherUser.email,
        subject: 'תזכורת יומית — מטלות ומשימות לבדיקה',
        body,
      });
      emailsSent++;
    }

    return Response.json({ status: 'ok', teachers_notified: emailsSent, total_checked: teacherIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});