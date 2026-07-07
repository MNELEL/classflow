import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Block anonymous callers — platform-scheduled invocations authenticate
    // as service role (isAuthenticated true, no user); anonymous direct calls
    // have no token at all.
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base44Admin = base44.asServiceRole;
    const today = new Date().toISOString().split('T')[0];

    // Fetch all pending/in_progress tasks
    const tasks = await base44Admin.entities.Task.filter({ status: 'pending' });
    const tasksInProgress = await base44Admin.entities.Task.filter({ status: 'in_progress' });
    const allTasks = [...tasks, ...tasksInProgress];

    // Filter overdue
    const overdueTasks = allTasks.filter(t => t.due_date && t.due_date < today);

    // Fetch existing alerts to avoid duplicates
    const existingAlerts = await base44Admin.entities.OverdueAlert.list();
    const alertedTaskIds = new Set(existingAlerts.map(a => a.task_id));

    // Fetch students
    const students = await base44Admin.entities.Student.list();
    const studentMap = {};
    students.forEach(s => { studentMap[s.id] = s.name; });

    let newAlerts = 0;
    for (const task of overdueTasks) {
      if (!alertedTaskIds.has(task.id)) {
        const dueDate = new Date(task.due_date);
        const todayDate = new Date(today);
        const daysOverdue = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));

        await base44Admin.entities.OverdueAlert.create({
          task_id: task.id,
          student_id: task.student_id,
          student_name: studentMap[task.student_id] || 'לא ידוע',
          task_title: task.title,
          due_date: task.due_date,
          days_overdue: daysOverdue,
          is_read: false,
          alerted_at: new Date().toISOString(),
        });
        newAlerts++;
      } else {
        // Update days_overdue for existing alerts
        const existing = existingAlerts.find(a => a.task_id === task.id);
        if (existing && !existing.is_read) {
          const dueDate = new Date(task.due_date);
          const todayDate = new Date(today);
          const daysOverdue = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));
          if (daysOverdue !== existing.days_overdue) {
            await base44Admin.entities.OverdueAlert.update(existing.id, { days_overdue: daysOverdue });
          }
        }
      }
    }

    return Response.json({ checked: allTasks.length, overdue: overdueTasks.length, newAlerts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});