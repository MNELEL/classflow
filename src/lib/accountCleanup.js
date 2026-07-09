import { base44 } from '@/api/base44Client';

// Entities the user owns via created_by_id. Deleted before account removal
// so no orphaned records remain. Admin-only entities (Classroom, Teacher,
// OverdueAlert, SentReminder, SchoolUpdate, TeacherMeeting) are excluded —
// RLS prevents user-scoped deletion and they're handled by the admin.
const USER_OWNED_ENTITIES = [
  'Student',
  'LibraryItem',
  'HomeworkAssignment',
  'BehaviorEvent',
  'FastFeedback',
  'ClassroomRaffle',
  'Worksheet',
  'Exam',
  'Grade',
  'SeatingArrangement',
  'SeatHistory',
  'Attendance',
  'WeeklyPlan',
  'StudyPlan',
  'BellSchedule',
  'SchoolEvent',
  'SharedLesson',
  'WeeklyBulletin',
  'TeacherSettings',
  'TeacherStyleProfile',
  'Task',
  'CurriculumWeek',
  'Reward',
  'Campaign',
  'ParentContact',
  'StudentPortfolioItem',
  'LessonPlan',
  'LessonCategory',
];

/**
 * Deletes all user-owned entities in parallel. Failures (e.g. RLS-restricted
 * entities) are swallowed via Promise.allSettled so the flow continues.
 */
export async function purgeUserData(user) {
  if (!user?.id) return;
  const filter = { created_by_id: user.id };
  await Promise.allSettled(
    USER_OWNED_ENTITIES.map(name =>
      base44.entities[name]?.deleteMany(filter)
    )
  );
}

/** Clears all local and session state for a clean post-deletion exit. */
export function clearLocalState() {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
}