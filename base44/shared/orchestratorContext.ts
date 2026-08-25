// Cross-module context gatherer for the One-Brain Orchestrator.
// Imported by the `orchestrator` backend function and the `aiAssistant`
// function so both share the same "brain snapshot" of all pedagogical data.
// The caller passes its own base44 client (user-scoped for on-demand,
// service-role for scheduled runs) — this module stays client-agnostic.

export async function gatherOrchestratorContext(base44) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const since60 = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];
  const in14 = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

  const [
    students, grades, attendance, tasks, homework,
    behavior, feedback, library, sharedLessons,
    parentContacts, rewards, events, exams,
    pendingUpdates,
  ] = await Promise.all([
    base44.entities.Student.list('-created_date', 300),
    base44.entities.Grade.list('-date', 200),
    base44.entities.Attendance.list('-date', 300),
    base44.entities.Task.list(),
    base44.entities.HomeworkAssignment.list('-due_date', 50),
    base44.entities.BehaviorEvent.list('-date', 200),
    base44.entities.FastFeedback.list('-date', 100),
    base44.entities.LibraryItem.list('-created_date', 50),
    base44.entities.SharedLesson.list('-shared_at', 50),
    base44.entities.ParentContact.list('-date', 30),
    base44.entities.Reward.list('-date', 200),
    base44.entities.SchoolEvent.list('-date', 50),
    base44.entities.Exam.list('-date', 50),
    // Recent AI-proposed updates — gives the assistant short-term memory
    // of what the teacher already logged/recently said, so it can resolve
    // ambiguous references ("הוא נעדר שוב", "תזכיר לי מה היה אתמול") against
    // prior context instead of treating each command in a vacuum.
    base44.entities.PendingUpdate.list('-created_date', 15),
  ]);

  return {
    students, grades, attendance, tasks, homework,
    behavior, feedback, library, sharedLessons,
    parentContacts, rewards, events, exams, pendingUpdates,
    today, since30, since60, in14,
  };
}

// Compact, LLM-friendly summary of the context — full rosters are too large
// to feed verbatim, so we project only the signal-carrying fields.
export function summarizeContextForAI(ctx) {
  const activeStudents = (ctx.students || []).filter(s => s.is_active !== false);
  const roster = activeStudents.map(s => ({
    id: s.id, name: s.name,
    academic_level: s.academic_level,
    traits: s.traits || [],
    special_needs: s.special_needs || [],
  }));

  const gradeSummary = (ctx.grades || []).slice(0, 100).map(g => ({
    student_id: g.student_id, subject: g.subject, score: g.score, date: g.date,
  }));

  const attendanceSummary = (ctx.attendance || []).slice(0, 150).map(a => ({
    student_id: a.student_id, status: a.status, date: a.date,
  }));

  const taskSummary = (ctx.tasks || []).filter(t => t.status !== 'done').map(t => ({
    student_id: t.student_id, title: t.title, due_date: t.due_date, status: t.status, subject: t.subject,
  }));

  const behaviorSummary = (ctx.behavior || []).slice(0, 80).map(b => ({
    student_id: b.student_id, type: b.behavior_type || b.type, category: b.category,
    description: b.description, severity: b.severity, date: b.date,
  }));

  // Short-term memory: the last handful of AI-proposed updates (any status),
  // so the assistant can connect a new free-form command to what the teacher
  // just told it (e.g. "הוא שוב נעדר" → resolve "הוא" against the last student
  // mentioned; "מה היה אתמול" → summarize recent pending/approved updates).
  const recentUpdates = (ctx.pendingUpdates || []).slice(0, 12).map(p => ({
    intent: p.intent,
    summary: p.summary,
    student_name: p.student_name || '',
    status: p.status,
    created_date: p.created_date,
  }));

  return {
    today: ctx.today,
    active_student_count: activeStudents.length,
    roster,
    grades: gradeSummary,
    attendance: attendanceSummary,
    open_tasks: taskSummary,
    behavior: behaviorSummary,
    recent_updates: recentUpdates,
    homework_count: (ctx.homework || []).length,
    library_count: (ctx.library || []).length,
    upcoming_events: (ctx.events || []).filter(e => e.date >= ctx.today).slice(0, 10).map(e => ({ title: e.title, date: e.date })),
    upcoming_exams: (ctx.exams || []).filter(e => e.date >= ctx.today && e.date <= ctx.in14).map(e => ({ title: e.title, subject: e.subject, date: e.date })),
  };
}