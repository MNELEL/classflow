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
  ]);

  return {
    students, grades, attendance, tasks, homework,
    behavior, feedback, library, sharedLessons,
    parentContacts, rewards, events, exams,
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
    student_id: b.student_id, type: b.behavior_type || b.type, date: b.date,
  }));

  return {
    today: ctx.today,
    active_student_count: activeStudents.length,
    roster,
    grades: gradeSummary,
    attendance: attendanceSummary,
    open_tasks: taskSummary,
    behavior: behaviorSummary,
    homework_count: (ctx.homework || []).length,
    library_count: (ctx.library || []).length,
    upcoming_events: (ctx.events || []).filter(e => e.date >= ctx.today).slice(0, 10).map(e => ({ title: e.title, date: e.date })),
    upcoming_exams: (ctx.exams || []).filter(e => e.date >= ctx.today && e.date <= ctx.in14).map(e => ({ title: e.title, subject: e.subject, date: e.date })),
  };
}